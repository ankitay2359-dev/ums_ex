import mysql.connector
from mysql.connector import pooling, Error
from werkzeug.security import check_password_hash, generate_password_hash
from datetime import datetime, date
from decimal import Decimal
import logging
from config import Config

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Connection pool for production reliability
_db_pool = None

def get_connection_pool():
    global _db_pool
    if _db_pool is None:
        try:
            _db_pool = pooling.MySQLConnectionPool(
                pool_name="udhaar_pool",
                pool_size=5,
                pool_reset_session=True,
                host=Config.DB_HOST,
                port=Config.DB_PORT,
                user=Config.DB_USER,
                password=Config.DB_PASSWORD,
                database=Config.DB_NAME
            )
            logger.info("MySQL connection pool created successfully.")
        except Error as err:
            logger.error(f"Error creating MySQL connection pool: {err}")
            return None
    return _db_pool

def get_db_connection():
    """Retrieve a database connection from the pool or establish direct connection."""
    pool = get_connection_pool()
    if pool:
        try:
            return pool.get_connection()
        except Error as err:
            logger.warning(f"Pool connection failed, fallback direct connect: {err}")
    
    # Direct connection fallback
    try:
        return mysql.connector.connect(
            host=Config.DB_HOST,
            port=Config.DB_PORT,
            user=Config.DB_USER,
            password=Config.DB_PASSWORD,
            database=Config.DB_NAME
        )
    except Error as err:
        logger.error(f"MySQL connection error: {err}")
        return None

def verify_admin(username, password):
    """Authenticate administrator using parameterized query and hashed password."""
    conn = get_db_connection()
    if not conn:
        return None
    cursor = conn.cursor(dictionary=True)
    try:
        query = "SELECT admin_id, username, password FROM admin WHERE username = %s LIMIT 1"
        cursor.execute(query, (username,))
        admin = cursor.fetchone()
        if admin and check_password_hash(admin['password'], password):
            return {
                'admin_id': admin['admin_id'],
                'username': admin['username']
            }
        return None
    except Error as err:
        logger.error(f"verify_admin error: {err}")
        return None
    finally:
        cursor.close()
        conn.close()

def get_dashboard_stats():
    """Fetch accurate, non-fictitious aggregated stats from MySQL database."""
    conn = get_db_connection()
    stats = {
        'total_customers': 0,
        'total_udhaar': 0.0,
        'total_paid': 0.0,
        'total_remaining': 0.0,
        'pending_customers_count': 0,
        'overdue_count': 0,
        'today_transactions_count': 0,
        'recent_udhaar': [],
        'recent_payments': []
    }
    if not conn:
        return stats
    
    cursor = conn.cursor(dictionary=True)
    today = date.today()
    try:
        # Total customers
        cursor.execute("SELECT COUNT(*) AS count FROM customers")
        res = cursor.fetchone()
        stats['total_customers'] = res['count'] if res else 0

        # Total Udhaar
        cursor.execute("SELECT COALESCE(SUM(amount), 0) AS total FROM udhaar")
        res = cursor.fetchone()
        stats['total_udhaar'] = float(res['total']) if res else 0.0

        # Total Paid
        cursor.execute("SELECT COALESCE(SUM(amount_paid), 0) AS total FROM payments")
        res = cursor.fetchone()
        stats['total_paid'] = float(res['total']) if res else 0.0

        stats['total_remaining'] = round(stats['total_udhaar'] - stats['total_paid'], 2)

        # Pending customers count & overdue count
        # A customer is pending if sum(udhaar) > sum(payments)
        pending_query = """
            SELECT c.customer_id,
                   COALESCE(u.total_u, 0) AS total_u,
                   COALESCE(p.total_p, 0) AS total_p,
                   (COALESCE(u.total_u, 0) - COALESCE(p.total_p, 0)) AS balance,
                   u.max_due_date
            FROM customers c
            LEFT JOIN (
                SELECT customer_id, SUM(amount) AS total_u, MAX(due_date) AS max_due_date
                FROM udhaar GROUP BY customer_id
            ) u ON c.customer_id = u.customer_id
            LEFT JOIN (
                SELECT customer_id, SUM(amount_paid) AS total_p
                FROM payments GROUP BY customer_id
            ) p ON c.customer_id = p.customer_id
            WHERE (COALESCE(u.total_u, 0) - COALESCE(p.total_p, 0)) > 0
        """
        cursor.execute(pending_query)
        pending_rows = cursor.fetchall()
        stats['pending_customers_count'] = len(pending_rows)
        
        overdue_cnt = 0
        for r in pending_rows:
            if r['max_due_date'] and r['max_due_date'] < today:
                overdue_cnt += 1
        stats['overdue_count'] = overdue_cnt

        # Today's transactions (udhaar + payments)
        cursor.execute("SELECT COUNT(*) as cnt FROM udhaar WHERE udhaar_date = %s", (today,))
        cnt1 = cursor.fetchone()['cnt']
        cursor.execute("SELECT COUNT(*) as cnt FROM payments WHERE payment_date = %s", (today,))
        cnt2 = cursor.fetchone()['cnt']
        stats['today_transactions_count'] = cnt1 + cnt2

        # Recent Udhaar (5 records)
        rec_u_query = """
            SELECT u.udhaar_id, u.customer_id, c.customer_name, u.product_name, 
                   u.amount, u.quantity, u.udhaar_date, u.due_date
            FROM udhaar u
            JOIN customers c ON u.customer_id = c.customer_id
            ORDER BY u.udhaar_date DESC, u.udhaar_id DESC
            LIMIT 5
        """
        cursor.execute(rec_u_query)
        stats['recent_udhaar'] = cursor.fetchall()

        # Recent Payments (5 records)
        rec_p_query = """
            SELECT p.payment_id, p.customer_id, c.customer_name, p.amount_paid, 
                   p.payment_date, p.payment_method
            FROM payments p
            JOIN customers c ON p.customer_id = c.customer_id
            ORDER BY p.payment_date DESC, p.payment_id DESC
            LIMIT 5
        """
        cursor.execute(rec_p_query)
        stats['recent_payments'] = cursor.fetchall()

        return stats
    except Error as err:
        logger.error(f"get_dashboard_stats error: {err}")
        return stats
    finally:
        cursor.close()
        conn.close()

def get_all_customers():
    """Retrieve all customers with their real-time calculated financial balances."""
    conn = get_db_connection()
    if not conn:
        return []
    cursor = conn.cursor(dictionary=True)
    try:
        query = """
            SELECT c.customer_id, c.customer_name, c.mobile, c.address, c.registration_date,
                   COALESCE(u.total_udhaar, 0) AS total_udhaar,
                   COALESCE(p.total_paid, 0) AS total_paid,
                   (COALESCE(u.total_udhaar, 0) - COALESCE(p.total_paid, 0)) AS balance
            FROM customers c
            LEFT JOIN (
                SELECT customer_id, SUM(amount) AS total_udhaar 
                FROM udhaar GROUP BY customer_id
            ) u ON c.customer_id = u.customer_id
            LEFT JOIN (
                SELECT customer_id, SUM(amount_paid) AS total_paid 
                FROM payments GROUP BY customer_id
            ) p ON c.customer_id = p.customer_id
            ORDER BY c.customer_id ASC
        """
        cursor.execute(query)
        rows = cursor.fetchall()
        for r in rows:
            r['total_udhaar'] = float(r['total_udhaar'])
            r['total_paid'] = float(r['total_paid'])
            r['balance'] = float(r['balance'])
        return rows
    except Error as err:
        logger.error(f"get_all_customers error: {err}")
        return []
    finally:
        cursor.close()
        conn.close()

def get_customer_by_id(customer_id):
    """Fetch customer details by primary key."""
    conn = get_db_connection()
    if not conn:
        return None
    cursor = conn.cursor(dictionary=True)
    try:
        query = "SELECT * FROM customers WHERE customer_id = %s"
        cursor.execute(query, (customer_id,))
        return cursor.fetchone()
    except Error as err:
        logger.error(f"get_customer_by_id error: {err}")
        return None
    finally:
        cursor.close()
        conn.close()

def add_customer(customer_name, mobile, address):
    """Add a new customer with auto-generated customer_id."""
    conn = get_db_connection()
    if not conn:
        return None
    cursor = conn.cursor()
    try:
        query = """
            INSERT INTO customers (customer_name, mobile, address, registration_date)
            VALUES (%s, %s, %s, CURRENT_DATE)
        """
        cursor.execute(query, (customer_name.strip(), mobile.strip() if mobile else None, address.strip() if address else None))
        conn.commit()
        return cursor.lastrowid
    except Error as err:
        logger.error(f"add_customer error: {err}")
        conn.rollback()
        return None
    finally:
        cursor.close()
        conn.close()

def update_customer(customer_id, customer_name, mobile, address):
    """Update existing customer details."""
    conn = get_db_connection()
    if not conn:
        return False
    cursor = conn.cursor()
    try:
        query = """
            UPDATE customers 
            SET customer_name = %s, mobile = %s, address = %s 
            WHERE customer_id = %s
        """
        cursor.execute(query, (customer_name.strip(), mobile.strip() if mobile else None, address.strip() if address else None, customer_id))
        conn.commit()
        return cursor.rowcount > 0
    except Error as err:
        logger.error(f"update_customer error: {err}")
        conn.rollback()
        return False
    finally:
        cursor.close()
        conn.close()

def delete_customer(customer_id):
    """Delete customer and related udhaar/payments using ON DELETE CASCADE foreign key."""
    conn = get_db_connection()
    if not conn:
        return False
    cursor = conn.cursor()
    try:
        # Transactions are atomic
        query = "DELETE FROM customers WHERE customer_id = %s"
        cursor.execute(query, (customer_id,))
        conn.commit()
        return cursor.rowcount > 0
    except Error as err:
        logger.error(f"delete_customer error: {err}")
        conn.rollback()
        return False
    finally:
        cursor.close()
        conn.close()

def search_customers(search_term):
    """
    Search customers by Customer ID, Name, or Mobile Number.
    Handles multiple customers with the same name (e.g. multiple 'Ankita').
    """
    conn = get_db_connection()
    if not conn:
        return []
    cursor = conn.cursor(dictionary=True)
    try:
        search_term = str(search_term).strip()
        like_pattern = f"%{search_term}%"

        # Check if search term is an exact integer ID
        if search_term.isdigit():
            query = """
                SELECT c.customer_id, c.customer_name, c.mobile, c.address, c.registration_date,
                       COALESCE(u.total_udhaar, 0) AS total_udhaar,
                       COALESCE(p.total_paid, 0) AS total_paid,
                       (COALESCE(u.total_udhaar, 0) - COALESCE(p.total_paid, 0)) AS balance
                FROM customers c
                LEFT JOIN (SELECT customer_id, SUM(amount) AS total_udhaar FROM udhaar GROUP BY customer_id) u ON c.customer_id = u.customer_id
                LEFT JOIN (SELECT customer_id, SUM(amount_paid) AS total_paid FROM payments GROUP BY customer_id) p ON c.customer_id = p.customer_id
                WHERE c.customer_id = %s OR c.customer_name LIKE %s OR c.mobile LIKE %s
                ORDER BY (c.customer_id = %s) DESC, c.customer_id ASC
            """
            cursor.execute(query, (int(search_term), like_pattern, like_pattern, int(search_term)))
        else:
            query = """
                SELECT c.customer_id, c.customer_name, c.mobile, c.address, c.registration_date,
                       COALESCE(u.total_udhaar, 0) AS total_udhaar,
                       COALESCE(p.total_paid, 0) AS total_paid,
                       (COALESCE(u.total_udhaar, 0) - COALESCE(p.total_paid, 0)) AS balance
                FROM customers c
                LEFT JOIN (SELECT customer_id, SUM(amount) AS total_udhaar FROM udhaar GROUP BY customer_id) u ON c.customer_id = u.customer_id
                LEFT JOIN (SELECT customer_id, SUM(amount_paid) AS total_paid FROM payments GROUP BY customer_id) p ON c.customer_id = p.customer_id
                WHERE c.customer_name LIKE %s OR c.mobile LIKE %s
                ORDER BY c.customer_name ASC, c.customer_id ASC
            """
            cursor.execute(query, (like_pattern, like_pattern))
            
        rows = cursor.fetchall()
        for r in rows:
            r['total_udhaar'] = float(r['total_udhaar'])
            r['total_paid'] = float(r['total_paid'])
            r['balance'] = float(r['balance'])
        return rows
    except Error as err:
        logger.error(f"search_customers error: {err}")
        return []
    finally:
        cursor.close()
        conn.close()

def get_customer_financial_summary(customer_id):
    """
    Get comprehensive customer profile, transactions history, and financial metrics.
    All calculations are strictly derived from actual database records.
    """
    conn = get_db_connection()
    if not conn:
        return None
    cursor = conn.cursor(dictionary=True)
    try:
        # Customer basic info
        cursor.execute("SELECT * FROM customers WHERE customer_id = %s", (customer_id,))
        customer = cursor.fetchone()
        if not customer:
            return None

        # Udhaar history
        u_query = """
            SELECT udhaar_id, product_name, amount, udhaar_date, quantity, due_date, notes
            FROM udhaar
            WHERE customer_id = %s
            ORDER BY udhaar_date DESC, udhaar_id DESC
        """
        cursor.execute(u_query, (customer_id,))
        udhaar_records = cursor.fetchall()
        for u in udhaar_records:
            u['amount'] = float(u['amount'])

        # Payment history
        p_query = """
            SELECT payment_id, amount_paid, payment_date, payment_method, notes
            FROM payments
            WHERE customer_id = %s
            ORDER BY payment_date DESC, payment_id DESC
        """
        cursor.execute(p_query, (customer_id,))
        payment_records = cursor.fetchall()
        for p in payment_records:
            p['amount_paid'] = float(p['amount_paid'])

        # Aggregate calculations
        total_udhaar = sum(u['amount'] for u in udhaar_records)
        total_paid = sum(p['amount_paid'] for p in payment_records)
        remaining_balance = round(total_udhaar - total_paid, 2)

        return {
            'customer': customer,
            'udhaar_records': udhaar_records,
            'payment_records': payment_records,
            'total_udhaar': round(total_udhaar, 2),
            'total_paid': round(total_paid, 2),
            'remaining_balance': remaining_balance
        }
    except Error as err:
        logger.error(f"get_customer_financial_summary error: {err}")
        return None
    finally:
        cursor.close()
        conn.close()

def add_udhaar(customer_id, product_name, amount, udhaar_date, quantity='1', due_date=None, notes=None):
    """Add a new Udhaar transaction for a customer."""
    conn = get_db_connection()
    if not conn:
        return None
    cursor = conn.cursor()
    try:
        query = """
            INSERT INTO udhaar (customer_id, product_name, amount, udhaar_date, quantity, due_date, notes)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        """
        cursor.execute(query, (
            customer_id,
            product_name.strip(),
            Decimal(str(amount)),
            udhaar_date,
            str(quantity).strip() if quantity else '1',
            due_date if due_date else None,
            notes.strip() if notes else None
        ))
        conn.commit()
        return cursor.lastrowid
    except Error as err:
        logger.error(f"add_udhaar error: {err}")
        conn.rollback()
        return None
    finally:
        cursor.close()
        conn.close()

def add_payment(customer_id, amount_paid, payment_date, payment_method='Cash', notes=None):
    """
    Record a new payment transaction.
    Creates a new distinct row in the payments table without overwriting prior payments.
    """
    conn = get_db_connection()
    if not conn:
        return None
    cursor = conn.cursor()
    try:
        query = """
            INSERT INTO payments (customer_id, amount_paid, payment_date, payment_method, notes)
            VALUES (%s, %s, %s, %s, %s)
        """
        cursor.execute(query, (
            customer_id,
            Decimal(str(amount_paid)),
            payment_date,
            payment_method if payment_method else 'Cash',
            notes.strip() if notes else None
        ))
        conn.commit()
        return cursor.lastrowid
    except Error as err:
        logger.error(f"add_payment error: {err}")
        conn.rollback()
        return None
    finally:
        cursor.close()
        conn.close()

def get_pending_customers():
    """
    Retrieve customers with unpaid credit (Total Udhaar > Total Paid).
    Calculates actual overdue status based on due dates.
    """
    conn = get_db_connection()
    if not conn:
        return []
    cursor = conn.cursor(dictionary=True)
    today = date.today()
    try:
        query = """
            SELECT c.customer_id, c.customer_name, c.mobile, c.address,
                   COALESCE(u.total_udhaar, 0) AS total_udhaar,
                   COALESCE(p.total_paid, 0) AS total_paid,
                   (COALESCE(u.total_udhaar, 0) - COALESCE(p.total_paid, 0)) AS remaining_balance,
                   u.max_due_date,
                   u.latest_udhaar_date
            FROM customers c
            INNER JOIN (
                SELECT customer_id, 
                       SUM(amount) AS total_udhaar, 
                       MAX(due_date) AS max_due_date,
                       MAX(udhaar_date) AS latest_udhaar_date
                FROM udhaar 
                GROUP BY customer_id
            ) u ON c.customer_id = u.customer_id
            LEFT JOIN (
                SELECT customer_id, SUM(amount_paid) AS total_paid 
                FROM payments 
                GROUP BY customer_id
            ) p ON c.customer_id = p.customer_id
            WHERE (COALESCE(u.total_udhaar, 0) - COALESCE(p.total_paid, 0)) > 0
            ORDER BY remaining_balance DESC
        """
        cursor.execute(query)
        rows = cursor.fetchall()
        for r in rows:
            r['total_udhaar'] = float(r['total_udhaar'])
            r['total_paid'] = float(r['total_paid'])
            r['remaining_balance'] = float(r['remaining_balance'])
            # Determine status
            if r['max_due_date'] and r['max_due_date'] < today:
                r['status'] = 'Overdue'
            else:
                r['status'] = 'Pending'
        return rows
    except Error as err:
        logger.error(f"get_pending_customers error: {err}")
        return []
    finally:
        cursor.close()
        conn.close()

def get_reports_data(report_type='all', start_date=None, end_date=None, customer_id=None):
    """Generate filtered report data for Udhaar, Payments, or Outstanding Balances."""
    conn = get_db_connection()
    if not conn:
        return {'udhaar': [], 'payments': [], 'outstanding': []}
    cursor = conn.cursor(dictionary=True)
    results = {'udhaar': [], 'payments': [], 'outstanding': []}
    
    try:
        # Udhaar report
        if report_type in ['all', 'udhaar']:
            u_query = """
                SELECT u.udhaar_id, u.customer_id, c.customer_name, c.mobile,
                       u.product_name, u.quantity, u.amount, u.udhaar_date, u.due_date, u.notes
                FROM udhaar u
                JOIN customers c ON u.customer_id = c.customer_id
                WHERE 1=1
            """
            params = []
            if start_date:
                u_query += " AND u.udhaar_date >= %s"
                params.append(start_date)
            if end_date:
                u_query += " AND u.udhaar_date <= %s"
                params.append(end_date)
            if customer_id:
                u_query += " AND u.customer_id = %s"
                params.append(customer_id)
            u_query += " ORDER BY u.udhaar_date DESC, u.udhaar_id DESC"
            cursor.execute(u_query, tuple(params))
            u_rows = cursor.fetchall()
            for row in u_rows:
                row['amount'] = float(row['amount'])
            results['udhaar'] = u_rows

        # Payments report
        if report_type in ['all', 'payments']:
            p_query = """
                SELECT p.payment_id, p.customer_id, c.customer_name, c.mobile,
                       p.amount_paid, p.payment_date, p.payment_method, p.notes
                FROM payments p
                JOIN customers c ON p.customer_id = c.customer_id
                WHERE 1=1
            """
            params = []
            if start_date:
                p_query += " AND p.payment_date >= %s"
                params.append(start_date)
            if end_date:
                p_query += " AND p.payment_date <= %s"
                params.append(end_date)
            if customer_id:
                p_query += " AND p.customer_id = %s"
                params.append(customer_id)
            p_query += " ORDER BY p.payment_date DESC, p.payment_id DESC"
            cursor.execute(p_query, tuple(params))
            p_rows = cursor.fetchall()
            for row in p_rows:
                row['amount_paid'] = float(row['amount_paid'])
            results['payments'] = p_rows

        # Outstanding balances report
        if report_type in ['all', 'outstanding']:
            out_query = """
                SELECT c.customer_id, c.customer_name, c.mobile, c.address,
                       COALESCE(u.total_u, 0) AS total_udhaar,
                       COALESCE(p.total_p, 0) AS total_paid,
                       (COALESCE(u.total_u, 0) - COALESCE(p.total_p, 0)) AS remaining_balance
                FROM customers c
                LEFT JOIN (SELECT customer_id, SUM(amount) AS total_u FROM udhaar GROUP BY customer_id) u ON c.customer_id = u.customer_id
                LEFT JOIN (SELECT customer_id, SUM(amount_paid) AS total_p FROM payments GROUP BY customer_id) p ON c.customer_id = p.customer_id
                WHERE 1=1
            """
            params = []
            if customer_id:
                out_query += " AND c.customer_id = %s"
                params.append(customer_id)
            out_query += " HAVING remaining_balance > 0 ORDER BY remaining_balance DESC"
            cursor.execute(out_query, tuple(params))
            out_rows = cursor.fetchall()
            for row in out_rows:
                row['total_udhaar'] = float(row['total_udhaar'])
                row['total_paid'] = float(row['total_paid'])
                row['remaining_balance'] = float(row['remaining_balance'])
            results['outstanding'] = out_rows

        return results
    except Error as err:
        logger.error(f"get_reports_data error: {err}")
        return results
    finally:
        cursor.close()
        conn.close()

def get_monthly_trends():
    """Retrieve monthly aggregates for chart visualization."""
    conn = get_db_connection()
    if not conn:
        return {'months': [], 'udhaar': [], 'payments': []}
    cursor = conn.cursor(dictionary=True)
    try:
        # Last 6 months aggregated
        query = """
            SELECT 
                DATE_FORMAT(u_date, '%b %Y') AS month_label,
                YEAR(u_date) as yr,
                MONTH(u_date) as mo,
                SUM(u_amt) as total_udhaar,
                SUM(p_amt) as total_payments
            FROM (
                SELECT udhaar_date AS u_date, amount AS u_amt, 0 AS p_amt FROM udhaar
                UNION ALL
                SELECT payment_date AS u_date, 0 AS u_amt, amount_paid AS p_amt FROM payments
            ) combined
            GROUP BY yr, mo, month_label
            ORDER BY yr ASC, mo ASC
            LIMIT 6
        """
        cursor.execute(query)
        rows = cursor.fetchall()
        months = [r['month_label'] for r in rows]
        udhaar = [float(r['total_udhaar']) for r in rows]
        payments = [float(r['total_payments']) for r in rows]
        return {'months': months, 'udhaar': udhaar, 'payments': payments}
    except Error as err:
        logger.error(f"get_monthly_trends error: {err}")
        return {'months': [], 'udhaar': [], 'payments': []}
    finally:
        cursor.close()
        conn.close()

def get_payment_receipt_data(payment_id):
    """Retrieve all data required to generate an official payment receipt."""
    conn = get_db_connection()
    if not conn:
        return None
    cursor = conn.cursor(dictionary=True)
    try:
        query = """
            SELECT p.payment_id, p.customer_id, p.amount_paid, p.payment_date, 
                   p.payment_method, p.notes,
                   c.customer_name, c.mobile, c.address
            FROM payments p
            JOIN customers c ON p.customer_id = c.customer_id
            WHERE p.payment_id = %s
        """
        cursor.execute(query, (payment_id,))
        payment = cursor.fetchone()
        if not payment:
            return None
        payment['amount_paid'] = float(payment['amount_paid'])

        # Calculate current remaining balance for this customer
        cursor.execute("SELECT COALESCE(SUM(amount), 0) as total FROM udhaar WHERE customer_id = %s", (payment['customer_id'],))
        total_u = float(cursor.fetchone()['total'])
        cursor.execute("SELECT COALESCE(SUM(amount_paid), 0) as total FROM payments WHERE customer_id = %s", (payment['customer_id'],))
        total_p = float(cursor.fetchone()['total'])

        remaining_balance = round(total_u - total_p, 2)
        # Previous balance before this payment
        previous_balance = round(remaining_balance + payment['amount_paid'], 2)

        return {
            'payment': payment,
            'customer': {
                'customer_id': payment['customer_id'],
                'customer_name': payment['customer_name'],
                'mobile': payment['mobile'],
                'address': payment['address']
            },
            'previous_balance': previous_balance,
            'remaining_balance': remaining_balance
        }
    except Error as err:
        logger.error(f"get_payment_receipt_data error: {err}")
        return None
    finally:
        cursor.close()
        conn.close()

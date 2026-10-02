import os
import io
import json
import logging
from datetime import datetime, date
from decimal import Decimal
from functools import wraps

from flask import (
    Flask, render_template, request, redirect, url_for, 
    session, flash, jsonify, send_file, abort
)
from werkzeug.security import generate_password_hash

# ReportLab imports for PDF generation
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter, A4
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch

from config import Config
import database

# Configure application logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
app.config.from_object(Config)

# Ensure generated reports directory exists
os.makedirs(Config.REPORTS_DIR, exist_ok=True)

# -----------------------------------------------------------------------------
# Security & Authentication Helpers
# -----------------------------------------------------------------------------
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'admin_id' not in session:
            flash("Please log in to access this page.", "warning")
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated_function

@app.context_processor
def inject_global_data():
    """Make shop details and admin username available in all Jinja2 templates."""
    return {
        'shop_name': Config.SHOP_NAME,
        'shop_phone': Config.SHOP_PHONE,
        'shop_address': Config.SHOP_ADDRESS,
        'current_admin': session.get('username', None),
        'current_year': datetime.now().year
    }

# -----------------------------------------------------------------------------
# Authentication Routes
# -----------------------------------------------------------------------------
@app.route('/')
def index():
    if 'admin_id' in session:
        return redirect(url_for('dashboard'))
    return redirect(url_for('login'))

@app.route('/login', methods=['GET', 'POST'])
def login():
    if 'admin_id' in session:
        return redirect(url_for('dashboard'))
        
    error = None
    if request.method == 'POST':
        username = request.form.get('username', '').strip()
        password = request.form.get('password', '').strip()

        if not username or not password:
            error = "Invalid username or password."
        else:
            admin = database.verify_admin(username, password)
            if admin:
                session.clear()
                session['admin_id'] = admin['admin_id']
                session['username'] = admin['username']
                flash(f"Welcome back, {admin['username']}!", "success")
                return redirect(url_for('dashboard'))
            else:
                error = "Invalid username or password."

    return render_template('login.html', error=error)

@app.route('/logout', methods=['GET', 'POST'])
def logout():
    session.clear()
    flash("You have been logged out successfully.", "info")
    return redirect(url_for('login'))

# -----------------------------------------------------------------------------
# Dashboard Route
# -----------------------------------------------------------------------------
@app.route('/dashboard')
@login_required
def dashboard():
    stats = database.get_dashboard_stats()
    monthly_data = database.get_monthly_trends()
    return render_template('dashboard.html', stats=stats, monthly_data=monthly_data)

# -----------------------------------------------------------------------------
# Customer Management Routes
# -----------------------------------------------------------------------------
@app.route('/customers', methods=['GET', 'POST'])
@login_required
def customers():
    if request.method == 'POST':
        customer_name = request.form.get('customer_name', '').strip()
        mobile = request.form.get('mobile', '').strip()
        address = request.form.get('address', '').strip()

        # Backend Validation
        if not customer_name:
            flash("Customer Name is required.", "danger")
            return redirect(url_for('customers'))

        new_id = database.add_customer(customer_name, mobile, address)
        if new_id:
            flash(f"Customer '{customer_name}' added successfully with Customer ID: {new_id}.", "success")
        else:
            flash("Failed to add customer. Please check database connection.", "danger")
        return redirect(url_for('customers'))

    customer_list = database.get_all_customers()
    return render_template('customers.html', customers=customer_list)

@app.route('/customer/<int:customer_id>')
@login_required
def customer_details(customer_id):
    summary = database.get_customer_financial_summary(customer_id)
    if not summary:
        flash("Customer not found.", "warning")
        return redirect(url_for('customers'))
    return render_template('customer_details.html', data=summary)

@app.route('/customer/edit/<int:customer_id>', methods=['POST'])
@login_required
def edit_customer(customer_id):
    customer_name = request.form.get('customer_name', '').strip()
    mobile = request.form.get('mobile', '').strip()
    address = request.form.get('address', '').strip()

    if not customer_name:
        flash("Customer Name is mandatory.", "danger")
        return redirect(url_for('customer_details', customer_id=customer_id))

    success = database.update_customer(customer_id, customer_name, mobile, address)
    if success:
        flash("Customer details updated successfully.", "success")
    else:
        flash("Failed to update customer details.", "danger")
    return redirect(url_for('customer_details', customer_id=customer_id))

@app.route('/customer/delete/<int:customer_id>', methods=['POST'])
@login_required
def delete_customer(customer_id):
    customer = database.get_customer_by_id(customer_id)
    if not customer:
        flash("Customer does not exist.", "warning")
        return redirect(url_for('customers'))
        
    success = database.delete_customer(customer_id)
    if success:
        flash(f"Customer #{customer_id} ({customer['customer_name']}) and transaction history deleted successfully.", "success")
    else:
        flash("Failed to delete customer.", "danger")
    return redirect(url_for('customers'))

# -----------------------------------------------------------------------------
# Customer Search Routes
# -----------------------------------------------------------------------------
@app.route('/customer_search')
@login_required
def customer_search():
    query = request.args.get('q', '').strip()
    results = []
    if query:
        results = database.search_customers(query)
    return render_template('customer_search.html', query=query, results=results)

@app.route('/search_customers')
@login_required
def search_customers_api():
    """AJAX JSON endpoint for dynamic search queries by ID, Name or Mobile."""
    query = request.args.get('term', '').strip()
    if not query:
        return jsonify([])
    results = database.search_customers(query)
    return jsonify(results)

@app.route('/get_customer_details')
@login_required
def get_customer_details_api():
    customer_id = request.args.get('customer_id', type=int)
    if not customer_id:
        return jsonify({'error': 'Missing customer_id'}), 400
    summary = database.get_customer_financial_summary(customer_id)
    if not summary:
        return jsonify({'error': 'Customer not found'}), 404
    return jsonify(summary)

# -----------------------------------------------------------------------------
# Udhaar Transactions Routes
# -----------------------------------------------------------------------------
@app.route('/udhaar', methods=['GET', 'POST'])
@login_required
def udhaar():
    if request.method == 'POST':
        try:
            customer_id = int(request.form.get('customer_id', 0))
            product_name = request.form.get('product_name', '').strip()
            amount_str = request.form.get('amount', '').strip()
            quantity = request.form.get('quantity', '1').strip()
            udhaar_date_str = request.form.get('udhaar_date', '').strip()
            due_date_str = request.form.get('due_date', '').strip()
            notes = request.form.get('notes', '').strip()

            # Validations
            if customer_id <= 0:
                flash("Please select a valid customer.", "danger")
                return redirect(url_for('udhaar'))

            if not product_name:
                flash("Product name is required.", "danger")
                return redirect(url_for('udhaar'))

            try:
                amount = float(amount_str)
                if amount <= 0:
                    raise ValueError
            except ValueError:
                flash("Amount must be a numeric value greater than zero.", "danger")
                return redirect(url_for('udhaar'))

            if not udhaar_date_str:
                udhaar_date_str = date.today().isoformat()

            due_date = due_date_str if due_date_str else None

            # Verify customer exists
            cust = database.get_customer_by_id(customer_id)
            if not cust:
                flash(f"Customer #{customer_id} does not exist.", "danger")
                return redirect(url_for('udhaar'))

            new_u_id = database.add_udhaar(
                customer_id, product_name, amount, udhaar_date_str, 
                quantity=quantity, due_date=due_date, notes=notes
            )
            if new_u_id:
                flash(f"Udhaar of ₹{amount:,.2f} recorded for {cust['customer_name']} (ID: {customer_id}).", "success")
                return redirect(url_for('customer_details', customer_id=customer_id))
            else:
                flash("Failed to record Udhaar transaction.", "danger")
        except Exception as e:
            logger.error(f"Error saving udhaar: {e}")
            flash("An error occurred while saving the Udhaar record.", "danger")

        return redirect(url_for('udhaar'))

    # GET: Load customers for dropdown and recent udhaar
    all_customers = database.get_all_customers()
    recent = database.get_reports_data('udhaar')['udhaar'][:15]
    selected_cid = request.args.get('customer_id', type=int)
    return render_template('udhaar.html', customers=all_customers, recent=recent, selected_cid=selected_cid)

# -----------------------------------------------------------------------------
# Payments Routes
# -----------------------------------------------------------------------------
@app.route('/payments', methods=['GET', 'POST'])
@login_required
def payments():
    if request.method == 'POST':
        try:
            customer_id = int(request.form.get('customer_id', 0))
            amount_str = request.form.get('amount_paid', '').strip()
            payment_date_str = request.form.get('payment_date', '').strip()
            payment_method = request.form.get('payment_method', 'Cash').strip()
            notes = request.form.get('notes', '').strip()

            if customer_id <= 0:
                flash("Please select a valid customer.", "danger")
                return redirect(url_for('payments'))

            try:
                amount_paid = float(amount_str)
                if amount_paid <= 0:
                    raise ValueError
            except ValueError:
                flash("Payment amount must be greater than zero.", "danger")
                return redirect(url_for('payments'))

            if not payment_date_str:
                payment_date_str = date.today().isoformat()

            cust = database.get_customer_by_id(customer_id)
            if not cust:
                flash(f"Customer #{customer_id} does not exist.", "danger")
                return redirect(url_for('payments'))

            pay_id = database.add_payment(
                customer_id, amount_paid, payment_date_str, 
                payment_method=payment_method, notes=notes
            )
            if pay_id:
                flash(f"Payment of ₹{amount_paid:,.2f} recorded successfully for {cust['customer_name']}. Receipt #{pay_id} generated.", "success")
                return redirect(url_for('payments', receipt_id=pay_id))
            else:
                flash("Failed to record payment.", "danger")
        except Exception as e:
            logger.error(f"Error saving payment: {e}")
            flash("An error occurred while saving the payment record.", "danger")

        return redirect(url_for('payments'))

    all_customers = database.get_all_customers()
    recent = database.get_reports_data('payments')['payments'][:15]
    receipt_id = request.args.get('receipt_id', type=int)
    selected_cid = request.args.get('customer_id', type=int)
    return render_template('payments.html', customers=all_customers, recent=recent, receipt_id=receipt_id, selected_cid=selected_cid)

# -----------------------------------------------------------------------------
# Pending Customers Route
# -----------------------------------------------------------------------------
@app.route('/pending_customers')
@login_required
def pending_customers():
    pending_list = database.get_pending_customers()
    total_pending_balance = sum(c['remaining_balance'] for c in pending_list)
    return render_template('pending_customers.html', pending_list=pending_list, total_pending_balance=total_pending_balance)

# -----------------------------------------------------------------------------
# Reports Route
# -----------------------------------------------------------------------------
@app.route('/reports')
@login_required
def reports():
    report_type = request.args.get('report_type', 'all')
    start_date = request.args.get('start_date', '')
    end_date = request.args.get('end_date', '')
    customer_id = request.args.get('customer_id', type=int)

    all_customers = database.get_all_customers()
    data = database.get_reports_data(
        report_type=report_type, 
        start_date=start_date if start_date else None, 
        end_date=end_date if end_date else None, 
        customer_id=customer_id
    )

    return render_template(
        'reports.html', 
        report_type=report_type, 
        start_date=start_date, 
        end_date=end_date, 
        selected_cid=customer_id, 
        customers=all_customers, 
        data=data
    )

# -----------------------------------------------------------------------------
# PDF Statements & Receipts Generation (ReportLab)
# -----------------------------------------------------------------------------
@app.route('/customer_statement/<int:customer_id>')
@login_required
def customer_statement(customer_id):
    """HTML preview of customer statement."""
    summary = database.get_customer_financial_summary(customer_id)
    if not summary:
        flash("Customer not found.", "warning")
        return redirect(url_for('customers'))
    return render_template('customer_statement.html', data=summary)

@app.route('/customer_statement_pdf/<int:customer_id>')
@login_required
def customer_statement_pdf(customer_id):
    """Generate professional PDF customer statement using ReportLab."""
    summary = database.get_customer_financial_summary(customer_id)
    if not summary:
        abort(404, description="Customer not found.")

    customer = summary['customer']
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer, 
        pagesize=A4, 
        rightMargin=36, 
        leftMargin=36, 
        topMargin=36, 
        bottomMargin=36
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'TitleStyle', 
        parent=styles['Heading1'], 
        fontSize=20, 
        leading=24, 
        textColor=colors.HexColor('#1E293B'),
        alignment=1 # Center
    )
    subtitle_style = ParagraphStyle(
        'SubTitleStyle', 
        parent=styles['Normal'], 
        fontSize=10, 
        textColor=colors.HexColor('#64748B'),
        alignment=1 # Center
    )
    section_heading = ParagraphStyle(
        'SectionHeading', 
        parent=styles['Heading2'], 
        fontSize=12, 
        leading=16, 
        textColor=colors.HexColor('#0F172A'),
        spaceBefore=10, 
        spaceAfter=6
    )
    cell_style = ParagraphStyle(
        'CellStyle', 
        parent=styles['Normal'], 
        fontSize=9, 
        leading=11
    )

    elements = []

    # Header: Shop Name & Details
    elements.append(Paragraph(f"<b>{Config.SHOP_NAME}</b>", title_style))
    elements.append(Paragraph(f"{Config.SHOP_ADDRESS} | Phone: {Config.SHOP_PHONE}", subtitle_style))
    elements.append(Paragraph(f"<b>CUSTOMER UDHAAR & PAYMENT STATEMENT</b>", ParagraphStyle('Sub', parent=subtitle_style, fontSize=11, textColor=colors.HexColor('#2563EB'))))
    elements.append(Spacer(1, 10))
    elements.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor('#2563EB'), spaceBefore=4, spaceAfter=12))

    # Customer & Statement Info Box
    cust_data = [
        [
            Paragraph(f"<b>Customer ID:</b> #{customer['customer_id']}", cell_style),
            Paragraph(f"<b>Statement Date:</b> {datetime.now().strftime('%d-%b-%Y %I:%M %p')}", cell_style)
        ],
        [
            Paragraph(f"<b>Customer Name:</b> {customer['customer_name']}", cell_style),
            Paragraph(f"<b>Mobile:</b> {customer['mobile'] or 'N/A'}", cell_style)
        ],
        [
            Paragraph(f"<b>Address:</b> {customer['address'] or 'N/A'}", cell_style),
            Paragraph(f"<b>Registered On:</b> {customer['registration_date']}", cell_style)
        ]
    ]
    cust_table = Table(cust_data, colWidths=[270, 270])
    cust_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#F8FAFC')),
        ('PADDING', (0,0), (-1,-1), 6),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#CBD5E1')),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE')
    ]))
    elements.append(cust_table)
    elements.append(Spacer(1, 12))

    # Financial Summary Badges Table
    rem_color = colors.HexColor('#DC2626') if summary['remaining_balance'] > 0 else colors.HexColor('#16A34A')
    summary_data = [
        ["Total Udhaar (Credit)", "Total Amount Paid", "Remaining Balance Outstanding"],
        [f"₹{summary['total_udhaar']:,.2f}", f"₹{summary['total_paid']:,.2f}", f"₹{summary['remaining_balance']:,.2f}"]
    ]
    summary_table = Table(summary_data, colWidths=[180, 180, 180])
    summary_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (0,0), colors.HexColor('#FEF2F2')),
        ('BACKGROUND', (1,0), (1,0), colors.HexColor('#F0FDF4')),
        ('BACKGROUND', (2,0), (2,0), colors.HexColor('#FEFCE8')),
        ('TEXTCOLOR', (0,0), (0,0), colors.HexColor('#991B1B')),
        ('TEXTCOLOR', (1,0), (1,0), colors.HexColor('#166534')),
        ('TEXTCOLOR', (2,0), (2,0), colors.HexColor('#854D0E')),
        ('TEXTCOLOR', (2,1), (2,1), rem_color),
        ('FONTNAME', (0,0), (-1,-1), 'Helvetica-Bold'),
        ('FONTSIZE', (0,0), (-1,0), 9),
        ('FONTSIZE', (0,1), (-1,1), 13),
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('GRID', (0,0), (-1,-1), 1, colors.HexColor('#CBD5E1')),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
    ]))
    elements.append(summary_table)
    elements.append(Spacer(1, 14))

    # Udhaar Transactions Section
    elements.append(Paragraph("<b>Udhaar (Credit) History</b>", section_heading))
    u_headers = ["ID", "Date", "Product Description", "Qty", "Due Date", "Amount (₹)"]
    u_rows = [u_headers]
    for u in summary['udhaar_records']:
        u_rows.append([
            f"#{u['udhaar_id']}",
            str(u['udhaar_date']),
            Paragraph(u['product_name'], cell_style),
            str(u['quantity'] or '1'),
            str(u['due_date'] or '-'),
            f"₹{u['amount']:,.2f}"
        ])
    if len(u_rows) == 1:
        u_rows.append(["-", "-", "No credit transactions recorded.", "-", "-", "₹0.00"])

    u_table = Table(u_rows, colWidths=[40, 70, 210, 60, 70, 90])
    u_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#F1F5F9')),
        ('TEXTCOLOR', (0,0), (-1,0), colors.HexColor('#1E293B')),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('FONTSIZE', (0,0), (-1,-1), 8),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E2E8F0')),
        ('ALIGN', (0,0), (1,-1), 'CENTER'),
        ('ALIGN', (-1,0), (-1,-1), 'RIGHT'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('PADDING', (0,0), (-1,-1), 5),
    ]))
    elements.append(u_table)
    elements.append(Spacer(1, 14))

    # Payments History Section
    elements.append(Paragraph("<b>Payment Receipts History</b>", section_heading))
    p_headers = ["Receipt ID", "Payment Date", "Payment Method", "Notes", "Amount Paid (₹)"]
    p_rows = [p_headers]
    for p in summary['payment_records']:
        p_rows.append([
            f"#{p['payment_id']}",
            str(p['payment_date']),
            p['payment_method'],
            Paragraph(p['notes'] or 'Instalment Payment', cell_style),
            f"₹{p['amount_paid']:,.2f}"
        ])
    if len(p_rows) == 1:
        p_rows.append(["-", "-", "-", "No payments recorded yet.", "₹0.00"])

    p_table = Table(p_rows, colWidths=[65, 85, 90, 200, 100])
    p_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#F1F5F9')),
        ('TEXTCOLOR', (0,0), (-1,0), colors.HexColor('#1E293B')),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('FONTSIZE', (0,0), (-1,-1), 8),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E2E8F0')),
        ('ALIGN', (0,0), (1,-1), 'CENTER'),
        ('ALIGN', (-1,0), (-1,-1), 'RIGHT'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('PADDING', (0,0), (-1,-1), 5),
    ]))
    elements.append(p_table)
    elements.append(Spacer(1, 20))

    # Footer Notes
    elements.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor('#CBD5E1'), spaceBefore=10, spaceAfter=8))
    footer_text = f"This statement was generated electronically by {Config.SHOP_NAME}. For any clarifications, contact {Config.SHOP_PHONE}."
    elements.append(Paragraph(footer_text, ParagraphStyle('Foot', parent=styles['Italic'], fontSize=8, textColor=colors.HexColor('#64748B'), alignment=1)))

    doc.build(elements)
    buffer.seek(0)
    filename = f"customer_statement_{customer_id}.pdf"
    return send_file(buffer, as_attachment=True, download_name=filename, mimetype='application/pdf')

@app.route('/receipt/<int:payment_id>')
@login_required
def payment_receipt_pdf(payment_id):
    """Generate official payment receipt PDF using ReportLab."""
    receipt_data = database.get_payment_receipt_data(payment_id)
    if not receipt_data:
        abort(404, description="Payment receipt not found.")

    payment = receipt_data['payment']
    customer = receipt_data['customer']

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer, 
        pagesize=(400, 520), # Compact receipt format
        rightMargin=20, 
        leftMargin=20, 
        topMargin=20, 
        bottomMargin=20
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'RTitle', 
        parent=styles['Heading1'], 
        fontSize=15, 
        leading=18, 
        textColor=colors.HexColor('#1E293B'),
        alignment=1
    )
    center_small = ParagraphStyle(
        'RSub', 
        parent=styles['Normal'], 
        fontSize=8, 
        textColor=colors.HexColor('#64748B'),
        alignment=1
    )
    cell_style = ParagraphStyle(
        'RCell', 
        parent=styles['Normal'], 
        fontSize=9, 
        leading=12
    )

    elements = []
    elements.append(Paragraph(f"<b>{Config.SHOP_NAME}</b>", title_style))
    elements.append(Paragraph(f"{Config.SHOP_ADDRESS} | Ph: {Config.SHOP_PHONE}", center_small))
    elements.append(Spacer(1, 4))
    elements.append(Paragraph("<b>OFFICIAL PAYMENT RECEIPT</b>", ParagraphStyle('Badge', parent=center_small, fontSize=10, textColor=colors.HexColor('#16A34A'))))
    elements.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#16A34A'), spaceBefore=6, spaceAfter=10))

    # Meta Table
    meta_info = [
        [Paragraph(f"<b>Receipt No:</b> REC-{payment['payment_id']:05d}", cell_style),
         Paragraph(f"<b>Date:</b> {payment['payment_date']}", cell_style)],
        [Paragraph(f"<b>Customer ID:</b> #{customer['customer_id']}", cell_style),
         Paragraph(f"<b>Payment Mode:</b> {payment['payment_method']}", cell_style)],
        [Paragraph(f"<b>Customer Name:</b> {customer['customer_name']}", cell_style),
         Paragraph(f"<b>Mobile:</b> {customer['mobile'] or 'N/A'}", cell_style)]
    ]
    meta_table = Table(meta_info, colWidths=[180, 180])
    meta_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#F8FAFC')),
        ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor('#CBD5E1')),
        ('PADDING', (0,0), (-1,-1), 4),
    ]))
    elements.append(meta_table)
    elements.append(Spacer(1, 10))

    # Ledger Financial Breakdown
    ledger_data = [
        ["Description", "Amount (₹)"],
        ["Previous Outstanding Balance", f"₹{receipt_data['previous_balance']:,.2f}"],
        ["Current Amount Received", f"(-) ₹{payment['amount_paid']:,.2f}"],
        ["New Remaining Balance", f"₹{receipt_data['remaining_balance']:,.2f}"]
    ]
    ledger_table = Table(ledger_data, colWidths=[240, 120])
    ledger_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#F1F5F9')),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E2E8F0')),
        ('ALIGN', (1,0), (1,-1), 'RIGHT'),
        ('PADDING', (0,0), (-1,-1), 6),
        ('FONTNAME', (0,2), (1,2), 'Helvetica-Bold'),
        ('TEXTCOLOR', (1,2), (1,2), colors.HexColor('#16A34A')),
        ('FONTNAME', (0,3), (1,3), 'Helvetica-Bold'),
        ('BACKGROUND', (0,3), (1,3), colors.HexColor('#FEFCE8')),
    ]))
    elements.append(ledger_table)
    elements.append(Spacer(1, 10))

    if payment['notes']:
        elements.append(Paragraph(f"<b>Notes:</b> {payment['notes']}", cell_style))
        elements.append(Spacer(1, 6))

    elements.append(Spacer(1, 10))
    elements.append(Paragraph("Thank you for your payment!", ParagraphStyle('Thanks', parent=center_small, fontSize=9, textColor=colors.HexColor('#1E293B'))))
    elements.append(Paragraph("Authorized Shopkeeper Signature: _______________________", ParagraphStyle('Sig', parent=center_small, fontSize=8, spaceBefore=16)))

    doc.build(elements)
    buffer.seek(0)
    filename = f"receipt_{payment_id}.pdf"
    return send_file(buffer, as_attachment=True, download_name=filename, mimetype='application/pdf')

# -----------------------------------------------------------------------------
# AI Assistant & Safety Architecture Routes
# -----------------------------------------------------------------------------
@app.route('/ai_assistant')
@login_required
def ai_assistant():
    all_customers = database.get_all_customers()
    return render_template('ai_assistant.html', customers=all_customers)

def call_gemini_model(prompt_text, system_instruction=None):
    """
    Server-side Gemini invocation via google-genai SDK with automatic
    fallback to gemini-3.1-flash-lite when rate limits (429) occur.
    Never exposes API key to client.
    """
    api_key = Config.GEMINI_API_KEY or os.environ.get("GEMINI_API_KEY", "")
    if not api_key:
        return "AI features require GEMINI_API_KEY to be configured in your environment or Settings > Secrets."
    
    try:
        from google import genai
        client = genai.Client(
            api_key=api_key,
            http_options={'headers': {'User-Agent': 'aistudio-build'}}
        )
        config_params = {}
        if system_instruction:
            config_params['system_instruction'] = system_instruction
            
        try:
            response = client.models.generateContent(
                model='gemini-3.8-flash',
                contents=prompt_text,
                config=config_params if config_params else None
            )
            return response.text or "No response from AI."
        except Exception as primary_err:
            err_str = str(primary_err)
            if '429' in err_str or 'RESOURCE_EXHAUSTED' in err_str or 'Quota' in err_str:
                logger.warning("Gemini 3.8 rate limit reached, falling back to gemini-3.1-flash-lite...")
                response_lite = client.models.generateContent(
                    model='gemini-3.1-flash-lite',
                    contents=prompt_text,
                    config=config_params if config_params else None
                )
                return response_lite.text or "No response from AI."
            raise primary_err
    except Exception as e:
        logger.error(f"Gemini API error / rate limit: {e}")
        err_str = str(e)
        if '429' in err_str or 'RESOURCE_EXHAUSTED' in err_str or 'Quota' in err_str:
            return "API rate limit reached on the free tier. Please retry in a few moments, or ask simple questions which can be answered directly from the ledger."
        return f"Could not process AI request: {str(e)}"

@app.route('/ai/chat', methods=['POST'])
@login_required
def ai_chat():
    """
    AI Chatbot endpoint with strictly enforced database safety architecture:
    1. Interprets user intent
    2. Backend identifies permitted safe operations
    3. Executes parameterized SQL through database.py
    4. Provides actual database data to Gemini
    5. Converts to helpful natural-language response.
    Never allows arbitrary SQL generation, DROP, DELETE, TRUNCATE, or ALTER.
    """
    data = request.get_json() or {}
    user_query = data.get('message', '').strip()

    if not user_query:
        return jsonify({'error': 'Message is required'}), 400

    # Fetch ground-truth shop data from MySQL to supply to AI context
    stats = database.get_dashboard_stats()
    pending = database.get_pending_customers()
    all_customers = database.get_all_customers()

    # Pre-structure factual data so Gemini NEVER hallucinates numbers
    customers_summary_data = [
        {
            'id': c['customer_id'],
            'name': c['customer_name'],
            'mobile': c['mobile'],
            'total_udhaar': c['total_udhaar'],
            'total_paid': c['total_paid'],
            'remaining_balance': c['balance']
        }
        for c in all_customers
    ]

    system_instruction = (
        f"You are the intelligent AI Shop Assistant for '{Config.SHOP_NAME}'. "
        "Your role is to assist the shop owner with managing credit (Udhaar), payments, and customer accounts. "
        "CRITICAL RULES:\n"
        "1. Strictly use ONLY the provided real database data below. NEVER invent, guess, or hallucinate customer balances, amounts, or transactions.\n"
        "2. If multiple customers have the same name (e.g. multiple 'Ankita'), always mention their Customer ID and phone number to differentiate them.\n"
        "3. You must NEVER execute or suggest destructive commands (DROP, DELETE, TRUNCATE, ALTER). Any modification to records requires explicit shopkeeper action via the UI.\n"
        "4. Always present currency in Indian Rupees (₹) with comma formatting.\n"
        "5. Be concise, polite, professional, and business-oriented.\n\n"
        f"SHOP SUMMARY STATS: Total Customers: {stats['total_customers']}, "
        f"Total Udhaar given: ₹{stats['total_udhaar']:,.2f}, "
        f"Total Paid: ₹{stats['total_paid']:,.2f}, "
        f"Total Remaining Balance: ₹{stats['total_remaining']:,.2f}, "
        f"Pending Customers Count: {stats['pending_customers_count']}, "
        f"Overdue Count: {stats['overdue_count']}.\n\n"
        f"REAL CUSTOMER DATABASE RECORDS:\n{json.dumps(customers_summary_data, indent=2)}\n\n"
        f"PENDING CUSTOMERS WITH DUE DATES:\n{json.dumps([{'id': p['customer_id'], 'name': p['customer_name'], 'balance': p['remaining_balance'], 'due_date': str(p['max_due_date']), 'status': p['status']} for p in pending], indent=2)}"
    )

    ai_reply = call_gemini_model(user_query, system_instruction=system_instruction)
    return jsonify({'reply': ai_reply})

@app.route('/ai/customer-summary', methods=['POST'])
@login_required
def ai_customer_summary():
    """Generate concise financial explanation for a specific customer based on actual records."""
    data = request.get_json() or {}
    customer_id = data.get('customer_id')
    if not customer_id:
        return jsonify({'error': 'customer_id is required'}), 400

    summary = database.get_customer_financial_summary(customer_id)
    if not summary:
        return jsonify({'error': 'Customer not found'}), 404

    customer = summary['customer']
    prompt = (
        f"Generate a professional, concise 3-4 sentence financial overview for the shop owner regarding customer:\n"
        f"Customer ID: #{customer['customer_id']}\n"
        f"Name: {customer['customer_name']}\n"
        f"Registered: {customer['registration_date']}\n"
        f"Total Udhaar given: ₹{summary['total_udhaar']:,.2f} across {len(summary['udhaar_records'])} transactions.\n"
        f"Total Payments received: ₹{summary['total_paid']:,.2f} across {len(summary['payment_records'])} payments.\n"
        f"Current Remaining Balance: ₹{summary['remaining_balance']:,.2f}.\n"
        "Recent transactions: " + json.dumps(summary['udhaar_records'][:3], default=str) + "\n"
        "Recent payments: " + json.dumps(summary['payment_records'][:3], default=str) + "\n\n"
        "Highlight payment discipline, current outstanding status, and whether their account is settled or pending. Do not make assumptions about character."
    )

    ai_text = call_gemini_model(prompt, system_instruction="You are a financial advisor for a retail store.")
    return jsonify({'summary': ai_text})

@app.route('/ai/generate-reminder', methods=['POST'])
@login_required
def ai_generate_reminder():
    """
    Generate an editable, polite reminder message based on the customer's actual outstanding balance.
    Does not send SMS automatically without shopkeeper action.
    """
    data = request.get_json() or {}
    customer_id = data.get('customer_id')
    tone = data.get('tone', 'polite') # polite, formal, firm

    if not customer_id:
        return jsonify({'error': 'customer_id is required'}), 400

    summary = database.get_customer_financial_summary(customer_id)
    if not summary:
        return jsonify({'error': 'Customer not found'}), 404

    customer = summary['customer']
    remaining = summary['remaining_balance']

    if remaining <= 0:
        return jsonify({
            'message': f"Hello {customer['customer_name']}, thank you for being a valued customer at {Config.SHOP_NAME}. Your account has zero pending balance. We look forward to serving you again!"
        })

    prompt = (
        f"Draft a polite, respectful WhatsApp/SMS reminder message in English (optionally with friendly Hindi greeting if appropriate) "
        f"from '{Config.SHOP_NAME}' to customer '{customer['customer_name']}' (Customer ID #{customer['customer_id']}).\n"
        f"Outstanding Udhaar balance is: ₹{remaining:,.2f}.\n"
        f"Tone requested: {tone}.\n"
        f"Include shop contact: {Config.SHOP_PHONE}.\n"
        "The message must be ready to send, friendly, polite, and respectful. Do not include placeholders like '[Date]'."
    )

    reminder_msg = call_gemini_model(prompt, system_instruction="You are a polite retail shop communication assistant.")
    return jsonify({
        'customer_name': customer['customer_name'],
        'mobile': customer['mobile'],
        'remaining_balance': remaining,
        'message': reminder_msg
    })

@app.route('/ai/financial-insights', methods=['POST'])
@login_required
def ai_financial_insights():
    """Explain pre-calculated shop financial trends and pending exposure using Gemini."""
    stats = database.get_dashboard_stats()
    monthly = database.get_monthly_trends()
    pending = database.get_pending_customers()

    prompt = (
        f"Provide 4 actionable retail financial insights for '{Config.SHOP_NAME}' based on these exact numbers:\n"
        f"- Total Customers: {stats['total_customers']}\n"
        f"- Total Udhaar Issued: ₹{stats['total_udhaar']:,.2f}\n"
        f"- Total Payments Collected: ₹{stats['total_paid']:,.2f}\n"
        f"- Net Outstanding Market Credit: ₹{stats['total_remaining']:,.2f}\n"
        f"- Pending Customers: {stats['pending_customers_count']}\n"
        f"- Overdue Customers: {stats['overdue_count']}\n"
        f"- Top 3 Outstanding Customers: {json.dumps([{'name': p['customer_name'], 'id': p['customer_id'], 'owed': p['remaining_balance']} for p in pending[:3]])}\n\n"
        "Format as 4 crisp bullet points with titles: 1. Credit Recovery Rate, 2. Overdue Risk Exposure, 3. Cash Flow Health, 4. Immediate Recommended Action."
    )

    insights = call_gemini_model(prompt, system_instruction="You are a retail business analyst specializing in Indian kirana and retail store finances.")
    return jsonify({'insights': insights})

# -----------------------------------------------------------------------------
# Application Runner
# -----------------------------------------------------------------------------
if __name__ == '__main__':
    # Default to running on 127.0.0.1:5000 as required
    port = int(os.environ.get("PORT", 5000))
    host = os.environ.get("HOST", "127.0.0.1")
    logger.info(f"Starting Udhaar Management System on http://{host}:{port}")
    app.run(host=host, port=port, debug=True)

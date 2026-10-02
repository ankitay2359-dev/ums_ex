# Udhaar Management System (उधार खाता प्रणाली)

A complete, production-ready, full-stack **Udhaar (Retail Credit) Management System** specifically designed for small retail and grocery (*kirana*) shop owners to track customer credit, record instalment payments, calculate real-time balances, print official PDF receipts & statements, and leverage a grounded **Gemini AI Assistant** for natural-language customer queries and reminder drafting.

---

## 1. Features

- **Customer Management**:
  - Add, edit, and safely delete customers with unique auto-generated **Customer IDs**.
  - Correctly handles customers with identical names (e.g. multiple "Ankita" records with distinct Customer IDs and phone numbers).
  - Quick lookup by Customer ID, name, or phone number.
- **Udhaar (Credit) Transactions**:
  - Record purchases with flexible quantities (e.g. `5kg`, `2 litres`, `3 packets`, `1 box`, `500g`).
  - Due date tracking and overdue indicators.
- **Payment Processing**:
  - Record payments separately (Cash, UPI, Card, Bank Transfer, Cheque, Other).
  - Every payment is preserved as an individual transaction record; prior payments are never overwritten.
  - Automatic balance recalculation (`Remaining Balance = Total Udhaar - Total Paid`).
- **Official PDF Statements & Receipts**:
  - Generate full **Customer Statement PDFs** using ReportLab (`customer_statement_<id>.pdf`).
  - Generate instant **Payment Receipt PDFs** (`receipt_<id>.pdf`) after every payment.
- **Interactive Dashboard**:
  - Live aggregated totals: Total Customers, Total Udhaar, Total Paid, Total Remaining.
  - Overdue balance counters and today's transaction count.
  - HTML5 Canvas visual charts: Monthly credit vs. payment trends and recovery ratio doughnut.
- **Pending & Overdue Customers Tracker**:
  - Direct list of customers where `Total Udhaar > Total Paid`.
  - Overdue alerts based on actual transaction due dates.
- **Financial & Audit Reports**:
  - Filter by date range, customer, and transaction type.
  - Printable and exportable report views.
- **AI Shop Assistant & Financial Copilot**:
  - **Grounded Safety Architecture**: strictly queries MySQL parameters; never hallucinates balances or deletes records.
  - Natural-language queries: *"How much does Rahul owe?"*, *"Show customers named Ankita"*, *"Who has the highest pending balance?"*.
  - AI Customer Financial Summary generator.
  - Personalized, editable WhatsApp/SMS reminder generator with selectable tone (Polite, Formal, Firm).
  - Web Speech API voice input (Microphone speech-to-text).

---

## 2. Technology Stack

- **Frontend**: HTML5, CSS3, Vanilla JavaScript, Responsive Design, Fetch API / AJAX.
- **Backend**: Python 3.10+, Flask 3.0.3, REST-style routes, Session-based authentication, Werkzeug password hashing.
- **Database**: MySQL with `mysql-connector-python` and connection pooling. All queries use parameterized SQL to prevent SQL injection.
- **PDF Generation**: ReportLab 4.2.0.
- **AI Integration**: Google Gemini API via the official `@google/genai` / `google-genai` Python SDK (`gemini-3.8-flash`).

---

## 3. Folder Structure

```text
Udhaar_Management_System/
│
├── app.py                      # Main Flask application and REST routes
├── database.py                 # MySQL database functions & parameterized queries
├── database.sql                # Complete MySQL database creation & seed scripts
├── config.py                   # Central configuration & environment loader
├── requirements.txt            # Python dependencies
├── .env.example                # Example environment variables template
├── README.md                   # Complete documentation
│
├── templates/                  # Jinja2 HTML templates
│   ├── base.html               # Master layout with responsive sidebar & header
│   ├── login.html              # Secure admin login
│   ├── dashboard.html          # Shop owner dashboard with stats & charts
│   ├── customers.html          # Customer directory & Add/Edit/Delete modals
│   ├── customer_search.html    # Dedicated multi-criteria customer search
│   ├── customer_details.html   # Customer profile, ledger & AI summary
│   ├── udhaar.html             # Add Udhaar transaction form
│   ├── payments.html           # Record payment & receipt generator
│   ├── pending_customers.html  # Pending & overdue accounts list
│   ├── reports.html            # Audit & transaction reports
│   ├── ai_assistant.html       # AI Chatbot with voice input & quick chips
│   └── customer_statement.html # Printable customer account statement
│
├── static/
│   ├── css/
│   │   └── style.css           # Clean master stylesheet
│   └── js/
│       ├── main.js             # Core utilities, modals & toast alerts
│       ├── customers.js        # Customer management handlers
│       ├── udhaar.js           # Udhaar form validation & calculations
│       ├── payments.js         # Payment form & balance projections
│       └── ai.js               # AI chat, voice recognition & reminder logic
│
└── generated_reports/          # Directory for generated PDF statements
```

---

## 4. Setup & Installation Guide

### Step 1: Install MySQL Server

Ensure MySQL Server (version 8.0 or later) or MariaDB is installed and running on your system.

- **Ubuntu / Debian**:
  ```bash
  sudo apt update
  sudo apt install mysql-server
  sudo systemctl start mysql
  ```
- **Windows / macOS**:
  Download and install MySQL Community Server or use XAMPP / WampServer.

### Step 2: Create Database & Tables

Open your MySQL terminal or phpMyAdmin and execute `database.sql`:

```bash
mysql -u root -p < database.sql
```

Or connect to MySQL and run:

```sql
SOURCE database.sql;
```

This creates the `udhaar_management` database, all 4 tables (`admin`, `customers`, `udhaar`, `payments`), indexes, foreign keys with cascade deletions, default administrator account, and sample shop data.

### Step 3: Set Up Python Virtual Environment

Navigate to the project directory:

```bash
cd Udhaar_Management_System
```

Create and activate a virtual environment:

- **On Windows**:
  ```cmd
  python -m venv venv
  venv\Scripts\activate
  ```
- **On Linux / macOS**:
  ```bash
  python3 -m venv venv
  source venv/bin/activate
  ```

### Step 4: Install Dependencies

```bash
pip install -r requirements.txt
```

### Step 5: Configure Environment Variables

Copy `.env.example` to `.env`:

- **Windows**:
  ```cmd
  copy .env.example .env
  ```
- **Linux / macOS**:
  ```bash
  cp .env.example .env
  ```

Open `.env` in a text editor and fill in your details:

```env
# Database Credentials
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=udhaar_management

# Flask Session Key
SECRET_KEY=supersecretkey_udhaar_shop_2026

# Gemini AI API Key
GEMINI_API_KEY=your_gemini_api_key_here

# Shop Details
SHOP_NAME=Shree Ganesh Kirana & General Store
SHOP_PHONE=+91 98765 43210
SHOP_ADDRESS=Shop No. 12, Main Market Road, Near Gandhi Chowk
```

---

## 5. Running the Application

Start the Flask development server:

```bash
python app.py
```

Open your browser and navigate to:

```text
http://127.0.0.1:5000
```

---

## 6. Default Login Credentials

- **Username**: `admin`
- **Password**: `admin123`

*(Note: Passwords are automatically hashed and validated with Werkzeug `check_password_hash`.)*

---

## 7. How to Use the System

1. **Dashboard**: Get an instant overview of total customers, credit given, cash collected, and outstanding market balance.
2. **Add Customers**: Go to **Customers** > click **+ Add New Customer**. Enter name, phone, and address. The system assigns a unique Customer ID.
3. **Record Udhaar**: Go to **Udhaar**, select a customer, enter items and quantity (e.g. `5kg sugar`), specify amount and promise due date.
4. **Record Payment**: Go to **Payments**, pick a customer, enter amount and method (Cash/UPI/etc.). The system recalculates their balance and offers a downloadable PDF receipt.
5. **View Customer Details**: Search or click any customer to view full transaction ledgers, print official account statements, or download PDF statements.
6. **Pending Customers**: Check which customers owe money and quickly identify overdue accounts.
7. **AI Assistant**:
   - Ask: *"How much does Ankita owe?"* (AI lists both Ankita #1 and #2 with their respective balances).
   - Ask: *"Who has the highest pending balance?"*.
   - Ask: *"Generate a polite reminder for Rahul Gupta"*.
   - Click the **Mic** button to speak your query.
   - Click **Get Business Insights** for retail cash-flow recommendations.

---

## 8. AI Safety & Database Integrity

The AI assistant operates on a **strict read-and-reason architecture**:
- User questions are parsed by the backend.
- Factual balances and transactions are fetched using parameterized SQL.
- Data is provided to Gemini as structured context.
- **The AI is strictly blocked from executing direct DDL or DML queries** (`DROP`, `DELETE`, `TRUNCATE`, `ALTER`).
- All credit and payment operations require explicit shopkeeper action through the authenticated web UI.

---

## 9. Troubleshooting

- **`MySQL Connection Refused`**:
  Ensure MySQL is running (`sudo systemctl status mysql` or MySQL service in Windows Services). Check `DB_HOST`, `DB_USER`, and `DB_PASSWORD` in `.env`.
- **`ModuleNotFoundError: No module named 'reportlab'`**:
  Make sure your virtual environment is active and run `pip install -r requirements.txt`.
- **`AI Assistant returns API Key error`**:
  Ensure `GEMINI_API_KEY` is set in `.env` or in your system environment.

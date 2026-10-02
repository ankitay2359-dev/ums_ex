import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

class Config:
    """Application configuration settings."""
    SECRET_KEY = os.getenv("SECRET_KEY", "super-secret-udhaar-mgmt-key-2026")
    
    # MySQL Database credentials
    DB_HOST = os.getenv("DB_HOST", "localhost")
    DB_PORT = int(os.getenv("DB_PORT", 3306))
    DB_USER = os.getenv("DB_USER", "root")
    DB_PASSWORD = os.getenv("DB_PASSWORD", "")
    DB_NAME = os.getenv("DB_NAME", "udhaar_management")
    
    # Gemini AI configuration
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
    
    # Shop details for receipts and PDF statements
    SHOP_NAME = os.getenv("SHOP_NAME", "Shree Ganesh Kirana & General Store")
    SHOP_PHONE = os.getenv("SHOP_PHONE", "+91 98765 43210")
    SHOP_ADDRESS = os.getenv("SHOP_ADDRESS", "Shop No. 12, Main Market Road, Near Gandhi Chowk")
    
    # Generated reports directory
    REPORTS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "generated_reports")
    
    # Session lifetime: 12 hours
    PERMANENT_SESSION_LIFETIME = 43200

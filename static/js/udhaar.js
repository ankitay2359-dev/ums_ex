/**
 * Udhaar Management System - Udhaar (Credit) Recording JavaScript
 */

function validateUdhaarForm() {
    const customerSelect = document.getElementById('customer_id');
    const productInput = document.getElementById('product_name');
    const amountInput = document.getElementById('amount');
    const dateInput = document.getElementById('udhaar_date');

    if (!customerSelect.value) {
        showToast('Please select a customer.', 'danger');
        customerSelect.focus();
        return false;
    }

    if (!productInput.value.trim()) {
        showToast('Product description is required.', 'danger');
        productInput.focus();
        return false;
    }

    const amt = parseFloat(amountInput.value);
    if (isNaN(amt) || amt <= 0) {
        showToast('Please enter a valid credit amount greater than 0.', 'danger');
        amountInput.focus();
        return false;
    }

    if (!dateInput.value) {
        showToast('Transaction date is required.', 'danger');
        dateInput.focus();
        return false;
    }

    return true;
}

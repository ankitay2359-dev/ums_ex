/**
 * Udhaar Management System - Payments JavaScript
 */

function validatePaymentForm() {
    const customerSelect = document.getElementById('pay_customer_id');
    const amountInput = document.getElementById('amount_paid');
    const dateInput = document.getElementById('payment_date');

    if (!customerSelect.value) {
        showToast('Please select a customer to receive payment.', 'danger');
        customerSelect.focus();
        return false;
    }

    const amt = parseFloat(amountInput.value);
    if (isNaN(amt) || amt <= 0) {
        showToast('Payment amount must be greater than zero.', 'danger');
        amountInput.focus();
        return false;
    }

    if (!dateInput.value) {
        showToast('Payment date is required.', 'danger');
        dateInput.focus();
        return false;
    }

    return true;
}

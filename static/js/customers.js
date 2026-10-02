/**
 * Udhaar Management System - Customer Management JavaScript
 */

function openAddCustomerModal() {
    const modal = document.getElementById('addCustomerModal');
    if (modal) {
        modal.style.display = 'flex';
        document.getElementById('new_customer_name').focus();
    }
}

function closeAddCustomerModal() {
    const modal = document.getElementById('addCustomerModal');
    if (modal) modal.style.display = 'none';
}

function validateAddCustomerForm() {
    const nameInput = document.getElementById('new_customer_name');
    if (!nameInput.value.trim()) {
        showToast('Customer Name is required.', 'danger');
        nameInput.focus();
        return false;
    }
    const mobileInput = document.getElementById('new_mobile');
    if (mobileInput.value.trim() && mobileInput.value.replace(/\D/g, '').length < 7) {
        showToast('Please enter a valid mobile number with at least 7 digits.', 'warning');
        mobileInput.focus();
        return false;
    }
    return true;
}

function openEditModal(cid, name, mobile, address) {
    const modal = document.getElementById('editCustomerModal');
    const form = document.getElementById('editCustomerForm');
    if (modal && form) {
        form.action = `/customer/edit/${cid}`;
        document.getElementById('edit_customer_id').value = cid;
        document.getElementById('edit_id_display').value = `#${cid}`;
        document.getElementById('edit_customer_name').value = name;
        document.getElementById('edit_mobile').value = mobile;
        document.getElementById('edit_address').value = address;
        modal.style.display = 'flex';
        document.getElementById('edit_customer_name').focus();
    }
}

function closeEditCustomerModal() {
    const modal = document.getElementById('editCustomerModal');
    if (modal) modal.style.display = 'none';
}

function confirmDeleteCustomer(cid, name) {
    showConfirmModal(
        'Delete Customer & History',
        `Are you sure you want to delete customer #${cid} (${name}) and their entire transaction history? This action cannot be undone.`,
        'Delete Customer',
        function() {
            const form = document.getElementById('deleteCustomerForm');
            form.action = `/customer/delete/${cid}`;
            form.submit();
        }
    );
}

function filterCustomerTable() {
    const query = document.getElementById('customerTableFilter').value.toLowerCase().trim();
    const rows = document.querySelectorAll('.customer-row');

    rows.forEach(row => {
        const id = row.getAttribute('data-id');
        const name = row.getAttribute('data-name');
        const mobile = row.getAttribute('data-mobile');

        if (id.includes(query) || name.includes(query) || mobile.includes(query)) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}

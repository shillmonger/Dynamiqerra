// Password toggle
function togglePassword(fieldId, icon) {
    let input = document.getElementById(fieldId);
    if (input.type === "password") {
        input.type = "text";
        icon.classList.replace("ri-eye-off-line", "ri-eye-line");
    } else {
        input.type = "password";
        icon.classList.replace("ri-eye-line", "ri-eye-off-line");
    }
}




// FUCTION TO MATCH PHONE NUM AND CODE
document.getElementById("phone").addEventListener("input", function () {
    let phoneInput = this.value;
    let regex = /^0\d{10}$/; // Must start with 0 and have 11 digits total

    if (!regex.test(phoneInput)) {
        this.style.border = "2px solid red";  // Show red border if invalid
    } else {
        this.style.border = "2px solid green"; // Green border if valid
    }
});





// Function for transaction password 
document.getElementById("txnPassword").addEventListener("input", function () {
    let txnInput = this.value;
    let regex = /^[0-9]{4}$/; // Exactly 4 digits

    if (!regex.test(txnInput)) {
        this.style.border = "2px solid red";  // Invalid
    } else {
        this.style.border = "2px solid green"; // Valid
    }
});





//  FUNCTION TO VIEW TRANSACTION PASSWORD
// FUNCTION TO VIEW TRANSACTION PASSWORD
function toggleTxnPassword(icon) {
    let input = document.getElementById("txnPassword");
    if (input.type === "password") {
        input.type = "text";
        icon.classList.replace("ri-eye-off-line", "ri-eye-line");
    } else {
        input.type = "password";
        icon.classList.replace("ri-eye-line", "ri-eye-off-line");
    }
}





//  FUNCTION TO VIEW PASSWORD
function togglePassword(fieldId, icon) {
    let input = document.getElementById(fieldId);
    if (input.type === "password") {
        input.type = "text";
        icon.classList.replace("ri-eye-off-line", "ri-eye-line");
    } else {
        input.type = "password";
        icon.classList.replace("ri-eye-line", "ri-eye-off-line");
    }
}





// FUNCTION THE CHEACK IF PASSWORD MATCH 
const password = document.getElementById('password');
const confirmPassword = document.getElementById('confirmPassword');

confirmPassword.addEventListener('input', () => {
    if (confirmPassword.value === "") {
        confirmPassword.style.border = "1px solid #a3a2a2"; // default border
    } else if (confirmPassword.value !== password.value) {
        confirmPassword.style.border = "2px solid #ff4d4f"; // red border
    } else {
        confirmPassword.style.border = "2px solid #4caf50"; // green border
    }
});

password.addEventListener('input', () => {
    if (confirmPassword.value !== "") {
        confirmPassword.dispatchEvent(new Event('input')); // re-validate if password changes
    }
});
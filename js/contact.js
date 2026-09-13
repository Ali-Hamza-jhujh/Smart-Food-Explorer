/* =========================================================
   contact.js — client-side form validation
   No backend exists on this static site, so a successful
   submission simply shows a confirmation message.
   ========================================================= */

const contactForm = document.getElementById('contactForm');
const formSuccess = document.getElementById('formSuccess');
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function setFieldValid(fieldEl) {
  fieldEl.classList.remove('invalid');
}

function setFieldInvalid(fieldEl) {
  fieldEl.classList.add('invalid');
}

function validateContactForm() {
  let isValid = true;

  const nameField = document.getElementById('nameField');
  const nameValue = document.getElementById('nameInput').value.trim();
  if (nameValue.length < 2) {
    setFieldInvalid(nameField);
    isValid = false;
  } else {
    setFieldValid(nameField);
  }

  const emailField = document.getElementById('emailField');
  const emailValue = document.getElementById('emailInput').value.trim();
  if (!EMAIL_PATTERN.test(emailValue)) {
    setFieldInvalid(emailField);
    isValid = false;
  } else {
    setFieldValid(emailField);
  }

  const messageField = document.getElementById('messageField');
  const messageValue = document.getElementById('messageInput').value.trim();
  if (messageValue.length < 10) {
    setFieldInvalid(messageField);
    isValid = false;
  } else {
    setFieldValid(messageField);
  }

  return isValid;
}

contactForm.addEventListener('submit', (event) => {
  event.preventDefault();
  formSuccess.classList.remove('active');

  if (!validateContactForm()) return;

  formSuccess.classList.add('active');
  contactForm.reset();
  [...contactForm.querySelectorAll('.field')].forEach(setFieldValid);
});

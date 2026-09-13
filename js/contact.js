// contact.js
// Client-side validation for the contact form. No backend exists in this
// project, so a successful submit just shows a confirmation message.

document.addEventListener('DOMContentLoaded', function () {
  var form = document.getElementById('contact-form');
  if (!form) return;

  var successBox = document.getElementById('form-success');

  form.addEventListener('submit', function (event) {
    event.preventDefault();

    var nameValid = validateName();
    var emailValid = validateEmail();
    var phoneValid = validatePhone();
    var messageValid = validateMessage();

    if (nameValid && emailValid && phoneValid && messageValid) {
      successBox.classList.add('is-visible');
      form.reset();
    } else {
      successBox.classList.remove('is-visible');
    }
  });

  function setError(fieldId, message) {
    var field = document.getElementById(fieldId);
    var errorBox = document.getElementById(fieldId + '-error');
    var wrapper = field.closest('.field');

    if (message) {
      errorBox.textContent = message;
      wrapper.classList.add('has-error');
      return false;
    }
    errorBox.textContent = '';
    wrapper.classList.remove('has-error');
    return true;
  }

  function validateName() {
    var value = form.name.value.trim();
    if (value.length < 2) {
      return setError('name', 'Please enter your name.');
    }
    return setError('name', '');
  }

  function validateEmail() {
    var value = form.email.value.trim();
    var pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!pattern.test(value)) {
      return setError('email', 'Please enter a valid email address.');
    }
    return setError('email', '');
  }

  function validatePhone() {
    var value = form.phone.value.trim();
    if (value === '') return setError('phone', ''); // optional field
    var pattern = /^[0-9+\-\s]{7,15}$/;
    if (!pattern.test(value)) {
      return setError('phone', 'Please enter a valid phone number.');
    }
    return setError('phone', '');
  }

  function validateMessage() {
    var value = form.message.value.trim();
    if (value.length < 10) {
      return setError('message', 'Message should be at least 10 characters.');
    }
    return setError('message', '');
  }
});

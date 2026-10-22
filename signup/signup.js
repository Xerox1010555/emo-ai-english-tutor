// ————— عناصر الصفحة —————
const form = document.getElementById("signupForm");
const nameInput = document.getElementById("name");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const confirmInput = document.getElementById("confirmPassword");
const termsInput = document.getElementById("terms");
const submitBtn = document.getElementById("submitBtn");
const submitLabel = document.getElementById("submitLabel");
const spinner = submitBtn.querySelector(".spinner");
const successBox = document.getElementById("successBox");
const toggleBtn = document.getElementById("togglePassword");
const eyeOpen = document.getElementById("eyeOpen");
const eyeClosed = document.getElementById("eyeClosed");
const strengthMeter = document.getElementById("strengthMeter");
const strengthLabel = document.getElementById("strengthLabel");

// ————— دوال الـ validation (نفس منطق الـ Login) —————

function setError(fieldId, message) {
  const field = document.getElementById(fieldId);
  const errorEl = field.querySelector(".error-msg");
  const input = field.querySelector("input, label");

  field.classList.remove("valid");
  field.classList.add("invalid");
  errorEl.textContent = message;
  if (input) input.setAttribute("aria-invalid", "true");
}

function setValid(fieldId) {
  const field = document.getElementById(fieldId);
  const errorEl = field.querySelector(".error-msg");
  const input = field.querySelector("input, label");

  field.classList.remove("invalid");
  field.classList.add("valid");
  errorEl.textContent = "";
  if (input) input.setAttribute("aria-invalid", "false");
}

function resetField(fieldId) {
  const field = document.getElementById(fieldId);
  const errorEl = field.querySelector(".error-msg");
  const input = field.querySelector("input, label");

  field.classList.remove("invalid", "valid");
  errorEl.textContent = "";
  if (input) input.removeAttribute("aria-invalid");
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// الاسم: مطلوب + حرفين على الأقل
function validateName() {
  const value = nameInput.value.trim();

  if (value === "") {
    setError("nameField", "الاسم مطلوب");
    return false;
  }
  if (value.length < 2) {
    setError("nameField", "الاسم قصير جدًا");
    return false;
  }
  setValid("nameField");
  return true;
}

// البريد: مطلوب + صيغة صحيحة
function validateEmail() {
  const value = emailInput.value.trim();

  if (value === "") {
    setError("emailField", "البريد الإلكتروني مطلوب");
    return false;
  }
  if (!EMAIL_REGEX.test(value)) {
    setError("emailField", "صيغة البريد الإلكتروني غير صحيحة");
    return false;
  }
  setValid("emailField");
  return true;
}

// كلمة المرور: 8+ وحروف وأرقام — مع نتيجة القوة
function validatePassword() {
  const value = passwordInput.value;

  if (value === "") {
    setError("passwordField", "كلمة المرور مطلوبة");
    return false;
  }
  if (value.length < 8) {
    setError("passwordField", "كلمة المرور يجب أن تكون 8 خانات على الأقل");
    return false;
  }
  if (!/[A-Za-z\u0600-\u06FF]/.test(value) || !/[0-9]/.test(value)) {
    setError("passwordField", "لازم تحتوي على حروف وأرقام");
    return false;
  }
  setValid("passwordField");
  return true;
}

// تأكيد كلمة المرور: مطلوبة + مطابقة
function validateConfirm() {
  const value = confirmInput.value;

  if (value === "") {
    setError("confirmField", "تأكيد كلمة المرور مطلوب");
    return false;
  }
  if (value !== passwordInput.value) {
    setError("confirmField", "كلمتا المرور غير متطابقتين");
    return false;
  }
  setValid("confirmField");
  return true;
}

// الموافقة على الشروط: مطلوبة
function validateTerms() {
  if (!termsInput.checked) {
    setError("termsField", "لازم توافق على الشروط والأحكام");
    return false;
  }
  setValid("termsField");
  return true;
}

// ————— مؤشر قوة كلمة المرور —————
// البنطال: الطول + رقم + حالة (كبير/صغير) + رمز
function scorePassword(value) {
  let score = 0;
  if (value.length >= 8) score++;
  if (value.length >= 12) score++;
  if (/[0-9]/.test(value)) score++;
  if (/[a-z]/.test(value) && /[A-Z]/.test(value)) score++;
  if (/[^A-Za-z0-9]/.test(value)) score++;
  return score;
}

function updateStrength() {
  const value = passwordInput.value;
  strengthMeter.hidden = value === "";

  if (value === "") {
    strengthMeter.dataset.level = "";
    strengthLabel.textContent = "قوة كلمة المرور";
    return;
  }

  const score = scorePassword(value);
  if (score <= 2) {
    strengthMeter.dataset.level = "weak";
    strengthLabel.textContent = "ضعيفة";
  } else if (score <= 4) {
    strengthMeter.dataset.level = "medium";
    strengthLabel.textContent = "متوسطة";
  } else {
    strengthMeter.dataset.level = "strong";
    strengthLabel.textContent = "قوية";
  }
}

// ————— التحقق الحي أثناء الكتابة —————
let touched = { name: false, email: false, password: false, confirm: false };

const liveValidation = [
  { input: nameInput, field: "nameField", key: "name", validate: validateName },
  { input: emailInput, field: "emailField", key: "email", validate: validateEmail },
  { input: passwordInput, field: "passwordField", key: "password", validate: validatePassword },
  { input: confirmInput, field: "confirmField", key: "confirm", validate: validateConfirm },
];

liveValidation.forEach(({ input, field, key, validate }) => {
  input.addEventListener("input", () => {
    if (touched[key]) validate();
    else {
      resetField(field);
      // إخفاء مؤشر القوة قبل أول تحقق
      if (key === "password") updateStrength();
    }
    // بمّا كلمة المرور بكت تتحقق، حدّث المؤشر
    if (key === "password") updateStrength();
  });

  input.addEventListener("blur", () => {
    if (input.value.trim() === "" && !touched[key]) {
      resetField(field);
      return;
    }
    touched[key] = true;
    validate();
  });
});

// لو كلمة المرور اتغيرت بعد ما المستخدم كتب التأكيد → نعيد فحص التطابق
passwordInput.addEventListener("input", () => {
  if (touched.confirm) validateConfirm();
});

// الشروط: أول ما يعلّم عليها نشيل الخطأ
termsInput.addEventListener("change", () => {
  if (termsInput.checked) setValid("termsField");
  else if (submitBtn.disabled) return; // وقت الإرسال بنتحقق في الـ submit
  else resetField("termsField");
});

// ————— زر إظهار/إخفاء كلمة المرور —————
toggleBtn.addEventListener("click", () => {
  const isHidden = passwordInput.type === "password";
  passwordInput.type = isHidden ? "text" : "password";
  eyeOpen.hidden = isHidden;
  eyeClosed.hidden = !isHidden;
  toggleBtn.setAttribute(
    "aria-label",
    isHidden ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"
  );
  passwordInput.focus();
});

// ————— إرسال النموذج —————
form.addEventListener("submit", (e) => {
  e.preventDefault(); // منع الإرسال الافتراضي عشان الـ validation يشتغل

  // علّم الحقول كلها كمتلامسة
  Object.keys(touched).forEach((k) => (touched[k] = true));

  const nameOk = validateName();
  const emailOk = validateEmail();
  const passwordOk = validatePassword();
  const confirmOk = validateConfirm();
  const termsOk = validateTerms();

  successBox.hidden = true;

  // رجّع التركيز لأول حقل غلط
  if (!nameOk) return nameInput.focus();
  if (!emailOk) return emailInput.focus();
  if (!passwordOk) return passwordInput.focus();
  if (!confirmOk) return confirmInput.focus();
  if (!termsOk) return termsInput.focus();

  // كل حاجة سليمة → محاكاة إنشاء الحساب على السيرفر
  submitBtn.disabled = true;
  spinner.hidden = false;
  submitLabel.textContent = "جاري إنشاء الحساب…";

  setTimeout(() => {
    spinner.hidden = true;
    submitLabel.textContent = "تم بنجاح";
    successBox.hidden = false;

    console.log("بيانات الحساب:", {
      name: nameInput.value.trim(),
      email: emailInput.value.trim(),
      terms: termsInput.checked,
    });

    // تحويل تلقائي لصفحة الدخول بعد ثواني
    setTimeout(() => (window.location.href = "index.html"), 2200);
  }, 1400);
});

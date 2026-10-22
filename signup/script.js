// ————— عناصر الصفحة —————
const form = document.getElementById("loginForm");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const submitBtn = document.getElementById("submitBtn");
const submitLabel = document.getElementById("submitLabel");
const spinner = submitBtn.querySelector(".spinner");
const successBox = document.getElementById("successBox");
const toggleBtn = document.getElementById("togglePassword");
const eyeOpen = document.getElementById("eyeOpen");
const eyeClosed = document.getElementById("eyeClosed");

// ————— دوال الـ validation —————

// تعريف خطأ على حقل معيّن
function setError(fieldId, message) {
  const field = document.getElementById(fieldId);
  const errorEl = field.querySelector(".error-msg");
  const input = field.querySelector("input");

  field.classList.remove("valid");
  field.classList.add("invalid");
  errorEl.textContent = message;
  input.setAttribute("aria-invalid", "true");
}

// مسح الخطأ واعتباره صحيحًا
function setValid(fieldId) {
  const field = document.getElementById(fieldId);
  const errorEl = field.querySelector(".error-msg");
  const input = field.querySelector("input");

  field.classList.remove("invalid");
  field.classList.add("valid");
  errorEl.textContent = "";
  input.setAttribute("aria-invalid", "false");
}

// إعادة الحقل لحالته الطبيعية (قبل أول تحقق)
function resetField(fieldId) {
  const field = document.getElementById(fieldId);
  const errorEl = field.querySelector(".error-msg");
  const input = field.querySelector("input");

  field.classList.remove("invalid", "valid");
  errorEl.textContent = "";
  input.removeAttribute("aria-invalid");
}

// التحقق من صيغة البريد الإلكتروني
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

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
  setValid("passwordField");
  return true;
}

// ————— التحقق الحي أثناء الكتابة —————
let touched = { email: false, password: false };

emailInput.addEventListener("input", () => {
  if (touched.email) validateEmail();
  else resetField("emailField");
});

passwordInput.addEventListener("input", () => {
  if (touched.password) validatePassword();
  else resetField("passwordField");
});

emailInput.addEventListener("blur", () => {
  if (emailInput.value.trim() === "" && !touched.email) {
    resetField("emailField");
    return;
  }
  touched.email = true;
  validateEmail();
});

passwordInput.addEventListener("blur", () => {
  if (passwordInput.value === "" && !touched.password) {
    resetField("passwordField");
    return;
  }
  touched.password = true;
  validatePassword();
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
  e.preventDefault(); // نمنع الإرسال الافتراضي عشان الـ validation يشتغل

  touched.email = true;
  touched.password = true;

  const emailOk = validateEmail();
  const passwordOk = validatePassword();

  successBox.hidden = true;

  // رجّع التركيز لأول حقل غلط
  if (!emailOk) {
    emailInput.focus();
    return;
  }
  if (!passwordOk) {
    passwordInput.focus();
    return;
  }

  // كل حاجة صحيحة → محاكاة إرسال للسيرفر
  submitBtn.disabled = true;
  spinner.hidden = false;
  submitLabel.textContent = "جاري تسجيل الدخول…";

  setTimeout(() => {
    spinner.hidden = true;
    submitLabel.textContent = "تم بنجاح";
    successBox.hidden = false;

    const remember = document.getElementById("remember").checked;
    console.log("بيانات الدخول:", {
      email: emailInput.value.trim(),
      remember,
    });
  }, 1500);
});

/* ————————————————————————————————
   تأثير الـ 3D: الكارت بيميل مع حركة الماوس
   + لمعان بيتبع المؤشر (.___mx / --my)
———————————————————————————————— */
const scene = document.querySelector(".scene");
const card = document.querySelector(".card");

// احترام إعداد "تقليل الحركة"
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
// الموبايل مفيهوش ماوس، فمش محتاجين التأثير ده
const isTouchDevice = window.matchMedia("(pointer: coarse)").matches;

if (scene && card && !reducedMotion && !isTouchDevice) {
  const MAX_TILT = 10; // أقصى ميل بالدرجات

  // الميل يتم مباشرة، والـ transition في الـ CSS بيراعي نعومة الفك
  scene.addEventListener("mousemove", (e) => {
    const rect = card.getBoundingClientRect();
    // الماوس جوا الكارت كنسبة من -0.5 لـ 0.5
    const nx = (e.clientX - rect.left) / rect.width - 0.5;
    const ny = (e.clientY - rect.top) / rect.height - 0.5;

    // الميل: يمين/شمال حول محور Y، فوق/تحت حول محور X
    const ry = nx * MAX_TILT * 2;
    const rx = -ny * MAX_TILT * 1.6;

    card.style.setProperty("--rx", rx.toFixed(3) + "deg");
    card.style.setProperty("--ry", ry.toFixed(3) + "deg");

    // تحريك اللّمعان لمكان المؤشر
    card.style.setProperty("--mx", ((nx + 0.5) * 100).toFixed(2) + "%");
    card.style.setProperty("--my", ((ny + 0.5) * 100).toFixed(2) + "%");
  });

  // الرجوع لوضع مستقيم من غير مسافة، والماوس يوصل الكارت
  scene.addEventListener("mouseleave", () => {
    card.style.setProperty("--rx", "0deg");
    card.style.setProperty("--ry", "0deg");
  });
}

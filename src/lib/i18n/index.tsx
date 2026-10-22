import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type UiLanguage = 'en' | 'ar';

const STORAGE_KEY = 'emo:ui-language';

interface I18nContextValue {
  language: UiLanguage;
  dir: 'ltr' | 'rtl';
  setLanguage: (language: UiLanguage) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextValue | undefined>(undefined);

/**
 * The interface dictionary.
 *
 * English is the source of truth: a key that is missing from the Arabic
 * dictionary falls back to the English string, so a half-finished translation
 * degrades to readable English instead of showing a raw key.
 */
const DICTIONARY: Record<UiLanguage, Record<string, string>> = {
  en: {
    'nav.home': 'Home',
    'nav.roadmap': 'Roadmap',
    'nav.quests': 'Quests',
    'nav.review': 'Review',
    'nav.chat': 'Chat',
    'nav.progress': 'Progress',
    'nav.schedule': 'Schedule',
    'nav.settings': 'Settings',
    'nav.vocabulary': 'Vocabulary',
    'nav.report': 'Weekly report',

    'common.retry': 'Try again',
    'common.cancel': 'Cancel',
    'common.save': 'Save changes',
    'common.saved': 'Saved',
    'common.continue': 'Continue',
    'common.loading': 'Loading...',
    'common.today': 'Today',
    'common.min': 'min',
    'common.xp': 'XP',
    'common.week': 'This week',
    'common.level': 'Level',
    'common.all': 'All',
    'common.close': 'Close',

    'home.title': 'ready to learn?',
    'home.greeting.morning': 'Good morning',
    'home.greeting.afternoon': 'Good afternoon',
    'home.greeting.evening': 'Good evening',
    'home.quests.title': 'Daily quests',
    'home.quests.all': 'All quests',
    'home.quests.complete': 'complete',
    'home.lesson.title': "Today's lesson",
    'home.lesson.start': 'Start lesson',
    'home.lesson.review': 'Review',
    'home.focus.title': 'Where the tutor is focusing',
    'home.actions.title': 'Quick actions',
    'home.action.chat': 'Chat with Emo',
    'home.action.roadmap': 'Roadmap',
    'home.action.skills': 'Skills',
    'home.action.schedule': 'Schedule',
    'home.action.quiz': 'Test yourself',
    'home.action.vocabulary': 'Vocabulary',
    'home.action.report': 'Weekly report',
    'home.recent.title': 'Recent chat',
    'home.stats.lessons': 'Lessons',
    'home.stats.quests': 'Quests',
    'home.stats.xp': 'XP',
    'home.streak': 'day streak',

    'quests.title': 'Daily Quests',
    'quests.subtitle': 'Generated from your level and the skills that need work',
    'quests.done': 'Done',
    'quests.mark': 'Mark complete',
    'quests.hint': 'Show hint',
    'quests.answer': 'Answer',
    'quests.celebrate.title': 'Every quest cleared',
    'quests.empty.title': 'No quests today',
    'quests.empty.body':
      'Complete a lesson or a chat session and tomorrow’s quests will adapt to what you did.',

    'roadmap.title': 'Your Roadmap',
    'roadmap.lesson': "Today's lesson",
    'roadmap.week': "This week's focus",
    'roadmap.journey': 'Journey',
    'roadmap.stage': 'Current stage',
    'roadmap.ask': 'Ask the tutor',
    'roadmap.practice': 'Practice this with the tutor',
    'roadmap.saveWords': 'Save these words to my deck',
    'roadmap.markComplete': 'Mark as complete',

    'progress.title': 'Progress',
    'progress.subtitle': 'Your learning journey at a glance',
    'progress.levelCheck': 'Level check',
    'progress.streak': 'Day Streak',
    'progress.lessons': 'Lessons Done',
    'progress.quiz': 'Avg Quiz',
    'progress.quests': 'Quests Done',
    'progress.skills': 'Skill breakdown',
    'progress.mistakes': 'What the tutor keeps correcting',
    'progress.trend': 'Quiz score trend',
    'progress.week': 'This week',
    'progress.vocab': 'Vocabulary mastery',
    'progress.history': 'Level history',
    'progress.xp': 'Total XP',
    'progress.toTarget': 'to target',
    'progress.openVocab': 'Open vocabulary studio',

    'vocab.title': 'Vocabulary',
    'vocab.subtitle': 'Words you are learning, reviewed with spaced repetition',
    'vocab.add': 'Add',
    'vocab.addToDeck': 'Add to deck',
    'vocab.words': 'Words',
    'vocab.due': 'Due now',
    'vocab.mastered': 'Mastered',
    'vocab.deck': 'Your deck',
    'vocab.review': 'Start review',
    'vocab.reveal': 'Reveal',
    'vocab.again': 'Again',
    'vocab.gotIt': 'Got it',
    'vocab.empty.title': 'No words yet',
    'vocab.empty.body':
      'Add words here, or save the words from a lesson into your deck.',

    'report.title': 'Weekly report',
    'report.story': 'Tell me my week',
    'report.refresh': 'Refresh the story',
    'report.compare': 'Week over week',
    'report.rhythm': 'Your rhythm',
    'report.movement': 'Skill movement',

    'chat.title': 'Emo',
    'chat.placeholder': 'Type in English...',
    'chat.speak': 'Speak now...',
    'chat.clear': 'Clear conversation',
    'chat.welcome':
      "I'm Emo. I know your level, your recent mistakes, and what you're working on — so I'll meet you there. Write to me in English, Arabic, or both. What do you want to work on?",

    'quiz.title': 'Quizzes',
    'quiz.start': 'Start Quiz',
    'quiz.again': 'Try Again',
    'quiz.next': 'Next Question',
    'quiz.results': 'See Results',

    'settings.title': 'Settings',
    'settings.subtitle': 'Manage your tutor, your goals, and your reminders',
    'settings.mode': 'Assistant personality',
    'settings.connection': 'AI tutor connection',
    'settings.target': 'Target level',
    'settings.goals': 'Learning goals',
    'settings.reminders': 'Reminders',
    'settings.time': 'Remind me at',
    'settings.frequency': 'Frequency',
    'settings.quiet': 'Respect quiet hours',
    'settings.language': 'Language support',
    'settings.interface': 'Interface language',
    'settings.push': 'Background reminders',
    'settings.push.on': 'Reminders can arrive when the app is closed.',
    'settings.push.off': 'Turn on background reminders to get nudges with the app closed.',
    'settings.push.unavailable': 'Background reminders are not available in this browser.',
    'settings.placement': 'Placement',
    'settings.retake': 'Retake',
    'settings.signout': 'Sign out',

    'auth.tagline': 'Your personal AI English learning assistant',
    'auth.signin': 'Sign In',
    'auth.signup': 'Sign Up',
    'auth.email': 'Email',
    'auth.password': 'Password',
    'auth.create': 'Create Account',
    'auth.forgot': 'Forgot password?',
    'auth.reset': 'Reset your password',
    'auth.resetSend': 'Send reset link',
    'auth.footer':
      'Adaptive lessons, daily practice, progress tracking, and a conversational tutor.',
    'auth.welcomeBack': 'Welcome back',
    'auth.signInSubtitle': 'Sign in and pick up where you left off.',
    'auth.createAccount': 'Create your account',
    'auth.createSubtitle': 'It takes less than a minute.',
    'auth.resetTitle': 'Reset your password',
    'auth.resetSubtitle': 'We will email you a link to set a new one.',
    'auth.name': 'Full name',
    'auth.namePlaceholder': 'Your name',
    'auth.nameError': 'Please enter your name.',
    'auth.confirmPassword': 'Confirm password',
    'auth.confirmError': 'The two passwords do not match.',
    'auth.terms': 'I agree to the terms and the privacy policy.',
    'auth.termsError': 'Please accept the terms to continue.',
    'auth.haveAccount': 'Already have an account?',
    'auth.noAccount': 'No account yet?',
    'auth.createdTitle': 'Your account is ready',
    'auth.createdBody': 'Let us take you into the app.',
    'auth.goToApp': 'Open the app',
    'auth.confirmNotice': 'Check your inbox to confirm your email, then sign in.',

    'placement.title': 'Placement Test',
    'placement.next': 'Next',
    'placement.results': 'See Results',
    'placement.question': 'Question',
    'placement.of': 'of',
  },
  ar: {
    'nav.home': 'الرئيسية',
    'nav.roadmap': 'الخارطة',
    'nav.quests': 'المهام',
    'nav.review': 'المراجعة',
    'nav.chat': 'المحادثة',
    'nav.progress': 'التقدم',
    'nav.schedule': 'المواعيد',
    'nav.settings': 'الإعدادات',
    'nav.vocabulary': 'المفردات',
    'nav.report': 'التقرير الأسبوعي',

    'common.retry': 'حاول مجدداً',
    'common.cancel': 'إلغاء',
    'common.save': 'حفظ التغييرات',
    'common.saved': 'تم الحفظ',
    'common.continue': 'متابعة',
    'common.loading': 'جارٍ التحميل...',
    'common.today': 'اليوم',
    'common.min': 'دقيقة',
    'common.xp': 'نقاط',
    'common.week': 'هذا الأسبوع',
    'common.level': 'المستوى',
    'common.all': 'الكل',
    'common.close': 'إغلاق',

    'home.title': 'جاهز تتعلم؟',
    'home.greeting.morning': 'صباح الخير',
    'home.greeting.afternoon': 'مساء الخير',
    'home.greeting.evening': 'مساء الخير',
    'home.quests.title': 'مهام اليوم',
    'home.quests.all': 'كل المهام',
    'home.quests.complete': 'مكتملة',
    'home.lesson.title': 'درس اليوم',
    'home.lesson.start': 'ابدأ الدرس',
    'home.lesson.review': 'مراجعة',
    'home.focus.title': 'تركيز المدرّس الآن',
    'home.actions.title': 'وصول سريع',
    'home.action.chat': 'تكلّم مع Emo',
    'home.action.roadmap': 'خارطة الطريق',
    'home.action.skills': 'المهارات',
    'home.action.schedule': 'المواعيد',
    'home.action.quiz': 'اختبر نفسك',
    'home.action.vocabulary': 'المفردات',
    'home.action.report': 'التقرير الأسبوعي',
    'home.recent.title': 'آخر محادثة',
    'home.stats.lessons': 'دروس',
    'home.stats.quests': 'مهام',
    'home.stats.xp': 'نقاط',
    'home.streak': 'أيام متتالية',

    'quests.title': 'مهام اليوم',
    'quests.subtitle': 'مولّدة من مستواك والمهارات التي تحتاج عملاً',
    'quests.done': 'تمت',
    'quests.mark': 'تم الإنجاز',
    'quests.hint': 'اظهر تلميحاً',
    'quests.answer': 'الإجابة',
    'quests.celebrate.title': 'أنجزت كل مهام اليوم',
    'quests.empty.title': 'لا مهام اليوم',
    'quests.empty.body': 'أنجز درساً أو محادثة وستتكيّف مهام الغد مع ما فعلت.',

    'roadmap.title': 'خارطة طريقك',
    'roadmap.lesson': 'درس اليوم',
    'roadmap.week': 'تركيز هذا الأسبوع',
    'roadmap.journey': 'الرحلة',
    'roadmap.stage': 'المرحلة الحالية',
    'roadmap.ask': 'اسأل المدرّس',
    'roadmap.practice': 'تدرّب على هذا مع المدرّس',
    'roadmap.saveWords': 'احفظ هذه الكلمات في قائمتي',
    'roadmap.markComplete': 'تم الإنجاز',

    'progress.title': 'التقدم',
    'progress.subtitle': 'رحلتك في التعلّم في لمحة',
    'progress.levelCheck': 'فحص المستوى',
    'progress.streak': 'أيام متتالية',
    'progress.lessons': 'دروس مُنجزة',
    'progress.quiz': 'متوسط الاختبار',
    'progress.quests': 'مهام مُنجزة',
    'progress.skills': 'توزيع المهارات',
    'progress.mistakes': 'ما يصحّحه المدرّس دائماً',
    'progress.trend': 'اتجاه نتائج الاختبارات',
    'progress.week': 'هذا الأسبوع',
    'progress.vocab': 'إتقان المفردات',
    'progress.history': 'سجل المستويات',
    'progress.xp': 'إجمالي النقاط',
    'progress.toTarget': 'نحو الهدف',
    'progress.openVocab': 'افتح استوديو المفردات',

    'vocab.title': 'المفردات',
    'vocab.subtitle': 'كلماتك التي تتعلّمها، بمراجعة متباعدة',
    'vocab.add': 'إضافة',
    'vocab.addToDeck': 'أضف للقائمة',
    'vocab.words': 'كلمة',
    'vocab.due': 'مستحقة اليوم',
    'vocab.mastered': 'مُتقنة',
    'vocab.deck': 'قائمتك',
    'vocab.review': 'ابدأ المراجعة',
    'vocab.reveal': 'اكشف',
    'vocab.again': 'مرة أخرى',
    'vocab.gotIt': 'عرفتها',
    'vocab.empty.title': 'لا كلمات بعد',
    'vocab.empty.body': 'أضف كلمات هنا، أو احفظ كلمات الدرس في قائمتك.',

    'report.title': 'التقرير الأسبوعي',
    'report.story': 'احكِ لي عن أسبوعي',
    'report.refresh': 'حدّث القصة',
    'report.compare': 'مقارنة الأسابيع',
    'report.rhythm': 'إيقاعك',
    'report.movement': 'تغيّر المهارات',

    'chat.title': 'Emo',
    'chat.placeholder': 'اكتب بالإنجليزية...',
    'chat.speak': 'تحدّث الآن...',
    'chat.clear': 'مسح المحادثة',
    'chat.welcome':
      'أنا Emo. أعرف مستواك وأخطائك الأخيرة وما تعمل عليه الآن — سألتقيك هناك. اكتب لي بالإنجليزية أو العربية أو كليهما. على ماذا نعمل؟',

    'quiz.title': 'الاختبارات',
    'quiz.start': 'ابدأ',
    'quiz.again': 'حاول مجدداً',
    'quiz.next': 'السؤال التالي',
    'quiz.results': 'عرض النتائج',

    'settings.title': 'الإعدادات',
    'settings.subtitle': 'أدر مدرّسك وأهدافك وتذكيرك',
    'settings.mode': 'شخصية المدرّس',
    'settings.connection': 'اتصال المدرّس الذكي',
    'settings.target': 'المستوى الهدف',
    'settings.goals': 'أهداف التعلّم',
    'settings.reminders': 'التذكيرات',
    'settings.time': 'ذكّرني في',
    'settings.frequency': 'التكرار',
    'settings.quiet': 'احترم الساعات الهادئة',
    'settings.language': 'دعم اللغة العربية',
    'settings.interface': 'لغة الواجهة',
    'settings.push': 'تذكيرات في الخلفية',
    'settings.push.on': 'يمكن للتذكيرات أن تصلك والتطبيق مغلق.',
    'settings.push.off': 'فعّل تذكيرات الخلفية لتصلك تنبيهات والتطبيق مغلق.',
    'settings.push.unavailable': 'تذكيرات الخلفية غير متاحة في هذا المتصفح.',
    'settings.placement': 'اختبار المستوى',
    'settings.retake': 'إعادة',
    'settings.signout': 'تسجيل الخروج',

    'auth.tagline': 'مدرّسك الشخصي للغة الإنجليزية بالذكاء الاصطناعي',
    'auth.signin': 'دخول',
    'auth.signup': 'حساب جديد',
    'auth.email': 'البريد الإلكتروني',
    'auth.password': 'كلمة المرور',
    'auth.create': 'إنشاء الحساب',
    'auth.forgot': 'نسيت كلمة المرور؟',
    'auth.reset': 'إعادة تعيين كلمة المرور',
    'auth.resetSend': 'إرسال الرابط',
    'auth.footer': 'دروس متكيّفة، ممارسة يومية، تتبّع التقدم، ومدرّس تحادثي.',
    'auth.welcomeBack': 'أهلاً بعودتك',
    'auth.signInSubtitle': 'سجّل دخولك وكمّل من حيث توقّفت.',
    'auth.createAccount': 'أنشئ حسابك',
    'auth.createSubtitle': 'أقل من دقيقة وتصبح جاهزاً.',
    'auth.resetTitle': 'إعادة تعيين كلمة المرور',
    'auth.resetSubtitle': 'سنرسل لك رابطاً لضبط كلمة مرور جديدة.',
    'auth.name': 'الاسم',
    'auth.namePlaceholder': 'اسمك الكامل',
    'auth.nameError': 'من فضلك اكتب اسمك.',
    'auth.confirmPassword': 'تأكيد كلمة المرور',
    'auth.confirmError': 'كلمتا المرور غير متطابقتين.',
    'auth.terms': 'أوافق على الشروط وسياسة الخصوصية.',
    'auth.termsError': 'من فضلك اقبل الشروط للمتابعة.',
    'auth.haveAccount': 'عندك حساب بالفعل؟',
    'auth.noAccount': 'لسه معندكش حساب؟',
    'auth.createdTitle': 'تم إنشاء حسابك',
    'auth.createdBody': 'يلا نوديك جوه التطبيق.',
    'auth.goToApp': 'افتح التطبيق',
    'auth.confirmNotice': 'راجع بريدك لتأكيد الحساب، وبعدين سجّل الدخول.',

    'placement.title': 'اختبار المستوى',
    'placement.next': 'التالي',
    'placement.results': 'عرض النتائج',
    'placement.question': 'السؤال',
    'placement.of': 'من',
  },
};

function detectLanguage(): UiLanguage {
  if (typeof window === 'undefined') return 'en';
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === 'ar' || stored === 'en') return stored;
  } catch {
    // Storage can be blocked; fall through to the browser preference.
  }
  return window.navigator.language?.toLowerCase().startsWith('ar') ? 'ar' : 'en';
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<UiLanguage>(detectLanguage);

  const dir = language === 'ar' ? 'rtl' : 'ltr';

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = dir;
  }, [language, dir]);

  const setLanguage = useCallback((next: UiLanguage) => {
    setLanguageState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Not fatal: the choice still applies for this session.
    }
  }, []);

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => {
      const table = DICTIONARY[language] ?? DICTIONARY.en;
      const fallback = DICTIONARY.en[key];
      let value = table[key] ?? fallback ?? key;
      if (vars) {
        for (const [name, replacement] of Object.entries(vars)) {
          value = value.replace(new RegExp(`\\{${name}\\}`, 'g'), String(replacement));
        }
      }
      return value;
    },
    [language],
  );

  const value = useMemo<I18nContextValue>(
    () => ({ language, dir, setLanguage, t }),
    [language, dir, setLanguage, t],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}

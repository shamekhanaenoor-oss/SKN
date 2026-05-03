// تبدیل تاریخ میلادی به هجری شمسی و برعکس
// الگوریتم بر اساس Julian Day Number - دقیق و تست‌شده

export const SHAMSI_MONTHS = [
  "حمل", "ثور", "جوزا", "سرطان", "اسد", "سنبله",
  "میزان", "عقرب", "قوس", "جدی", "دلو", "حوت"
];

export function getShamsiMonths() {
  return SHAMSI_MONTHS.map((name, i) => ({ value: i + 1, label: name }));
}

export function getShamsiMonthName(month: number): string {
  return SHAMSI_MONTHS[month - 1] ?? "";
}

// تبدیل میلادی به شمسی - الگوریتم دقیق
export function gregorianToShamsi(gy: number, gm: number, gd: number): [number, number, number] {
  const g_y = gy - 1600;
  const g_m = gm - 1;
  const g_d = gd - 1;

  let g_d_no = 365 * g_y + Math.floor((g_y + 3) / 4) - Math.floor((g_y + 99) / 100) + Math.floor((g_y + 399) / 400);

  const gMonthDays = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  g_d_no += gMonthDays[g_m] + g_d;

  if (g_m > 1 && ((g_y % 4 === 0 && g_y % 100 !== 0) || g_y % 400 === 0)) g_d_no++;

  let j_d_no = g_d_no - 79;

  const j_np = Math.floor(j_d_no / 12053);
  j_d_no = j_d_no % 12053;

  let jy = 979 + 33 * j_np + 4 * Math.floor(j_d_no / 1461);
  j_d_no %= 1461;

  if (j_d_no >= 366) {
    jy += Math.floor((j_d_no - 1) / 365);
    j_d_no = (j_d_no - 1) % 365;
  }

  const jMonthDays = [31, 31, 31, 31, 31, 31, 30, 30, 30, 30, 30, 29];
  let jm = 0;
  for (let i = 0; i < 11; i++) {
    if (j_d_no >= jMonthDays[i]) {
      j_d_no -= jMonthDays[i];
      jm++;
    } else {
      break;
    }
  }

  return [jy, jm + 1, j_d_no + 1];
}

// تبدیل شمسی به میلادی
export function shamsiToGregorian(jy: number, jm: number, jd: number): [number, number, number] {
  jy -= 979;
  jm -= 1;
  jd -= 1;

  const jMonthDays = [31, 31, 31, 31, 31, 31, 30, 30, 30, 30, 30, 29];
  let j_day_no = 365 * jy + Math.floor(jy / 33) * 8 + Math.floor((jy % 33 + 3) / 4);
  for (let i = 0; i < jm; i++) j_day_no += jMonthDays[i];
  j_day_no += jd;

  const g_day_no = j_day_no + 79;

  let gy = 1600 + 400 * Math.floor(g_day_no / 146097);
  let g_d = g_day_no % 146097;

  let leap = true;
  if (g_d >= 36525) {
    g_d--;
    gy += 100 * Math.floor(g_d / 36524);
    g_d = g_d % 36524;
    if (g_d >= 365) g_d++;
    else leap = false;
  }

  gy += 4 * Math.floor(g_d / 1461);
  g_d %= 1461;

  if (g_d >= 366) {
    leap = false;
    g_d--;
    gy += Math.floor(g_d / 365);
    g_d = g_d % 365;
  }

  const gMonthDays = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  let gm = 0;
  for (let i = 0; i < 12; i++) {
    if (g_d < gMonthDays[i]) { gm = i + 1; break; }
    g_d -= gMonthDays[i];
  }

  return [gy, gm, g_d + 1];
}

// تبدیل رشته ISO (YYYY-MM-DD) به شمسی
export function isoToShamsi(iso: string): { year: number; month: number; day: number } | null {
  if (!iso) return null;
  const parts = iso.split("-");
  if (parts.length !== 3) return null;
  const [gy, gm, gd] = parts.map(Number);
  if (!gy || !gm || !gd) return null;
  const [jy, jm, jd] = gregorianToShamsi(gy, gm, gd);
  return { year: jy, month: jm, day: jd };
}

// تبدیل شمسی به رشته ISO
export function shamsiToIso(year: number, month: number, day: number): string {
  const [gy, gm, gd] = shamsiToGregorian(year, month, day);
  return `${gy}-${String(gm).padStart(2, "0")}-${String(gd).padStart(2, "0")}`;
}

// تاریخ امروز به شمسی
export function todayShamsi(): { year: number; month: number; day: number } {
  const now = new Date();
  const [jy, jm, jd] = gregorianToShamsi(now.getFullYear(), now.getMonth() + 1, now.getDate());
  return { year: jy, month: jm, day: jd };
}

// تعداد روزهای ماه شمسی
export function shamsiMonthDays(year: number, month: number): number {
  if (month <= 6) return 31;
  if (month <= 11) return 30;
  return isShamsiLeap(year) ? 30 : 29;
}

export function isShamsiLeap(year: number): boolean {
  const breaks = [1, 5, 9, 13, 17, 22, 26, 30];
  const mod = ((year - 474) % 2820 + 474 + 38) % 2820;
  return breaks.some(b => mod % 128 === b % 128) || mod % 128 === 0;
}

/**
 * محاسبه سن بر اساس تاریخ تولد ISO (YYYY-MM-DD)
 * سن بر اساس تقویم شمسی محاسبه می‌شود
 * برمی‌گرداند: { years, months } یا null اگر تاریخ نامعتبر باشد
 */
export function calcAgeFromIso(dobIso: string): { years: number; months: number } | null {
  if (!dobIso) return null;
  const dob = isoToShamsi(dobIso);
  if (!dob) return null;
  const now = todayShamsi();

  let years = now.year - dob.year;
  let months = now.month - dob.month;

  if (months < 0 || (months === 0 && now.day < dob.day)) {
    years--;
    months += 12;
  }
  if (now.day < dob.day) {
    months--;
    if (months < 0) months += 12;
  }

  if (years < 0) return null;
  return { years, months };
}

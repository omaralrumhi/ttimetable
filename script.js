/**
 * نظام الجدول المدرسي الذكي - النسخة النهائية الموحدة 2026
 * ميزة الربط الذكي: البحث بالاسم لتفادي إزاحة الحصص بسبب "الفسحة"
 */

const sheetUrls = {
    "الأحد": "https://docs.google.com/spreadsheets/d/e/2PACX-1vQcHAJak0bVPCbVvk2OWUs84l8YrXOqhBWVUSrgyHRVjqd_lJ30DzQKuemvziO0_zgA7lb9V0pLGKno/pub?gid=0&single=true&output=csv",
    "الإثنين": "https://docs.google.com/spreadsheets/d/e/2PACX-1vQcHAJak0bVPCbVvk2OWUs84l8YrXOqhBWVUSrgyHRVjqd_lJ30DzQKuemvziO0_zgA7lb9V0pLGKno/pub?gid=387606236&single=true&output=csv", 
    "الثلاثاء": "https://docs.google.com/spreadsheets/d/e/2PACX-1vQcHAJak0bVPCbVvk2OWUs84l8YrXOqhBWVUSrgyHRVjqd_lJ30DzQKuemvziO0_zgA7lb9V0pLGKno/pub?gid=2132518963&single=true&output=csv",
    "الأربعاء": "https://docs.google.com/spreadsheets/d/e/2PACX-1vQcHAJak0bVPCbVvk2OWUs84l8YrXOqhBWVUSrgyHRVjqd_lJ30DzQKuemvziO0_zgA7lb9V0pLGKno/pub?gid=1914161473&single=true&output=csv",
    "الخميس": "https://docs.google.com/spreadsheets/d/e/2PACX-1vQcHAJak0bVPCbVvk2OWUs84l8YrXOqhBWVUSrgyHRVjqd_lJ30DzQKuemvziO0_zgA7lb9V0pLGKno/pub?gid=1287360203&single=true&output=csv",
    "العبارات": "https://docs.google.com/spreadsheets/d/e/2PACX-1vQcHAJak0bVPCbVvk2OWUs84l8YrXOqhBWVUSrgyHRVjqd_lJ30DzQKuemvziO0_zgA7lb9V0pLGKno/pub?gid=1453340959&single=true&output=csv"
};

// --- 1. الوظيفة الرئيسية لبدء النظام ---
async function initSystem() {
    const days = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
    const now = new Date();
    const dayName = days[now.getDay()];

    if (dayName === "الجمعة" || dayName === "السبت") {
        showWeekendMode();
        return;
    }

    try {
        const cacheBuster = "&t=" + new Date().getTime();
        
        // جلب جدول الأحد دائماً (لأنه المرجع للأوقات وأسماء الحصص)
        const resSun = await fetch(sheetUrls["الأحد"] + cacheBuster);
        const rowsSun = parseCSV(await resSun.text());

        let rowsToday = null;
        if (dayName !== "الأحد" && sheetUrls[dayName]) {
            const resDay = await fetch(sheetUrls[dayName] + cacheBuster);
            rowsToday = parseCSV(await resDay.text());
        }

        updateUI(rowsSun, rowsToday, dayName);
        updateTicker();
    } catch (e) { console.error("Error initSystem:", e); }
}

function parseCSV(t) { return t.split('\n').map(r => r.split(',').map(c => c.replace(/"/g, '').trim())); }

// --- 2. تحديث الواجهة والتعامل مع الحصص والفسحة ---
function updateUI(rowsSun, rowsToday, dayName) {
    const now = new Date();
    const curTime = now.getHours().toString().padStart(2,'0') + ":" + now.getMinutes().toString().padStart(2,'0');

    // استخراج أسماء الفصول (من السطر الثاني في شيت الأحد)
    const classNames = rowsSun[1].slice(5).filter(n => n);
    let sidebarHtml = `<div class="sidebar-top-headers"><span class="header-label-main">الحصة</span><div class="header-label-times"><span class="label-from">من</span><span class="label-to">إلى</span></div></div>`;

    let currentData = null;

    // نبدأ من السطر الثالث في شيت الأحد (الحصص)
    for (let i = 2; i < rowsSun.length; i++) {
        const sRow = rowsSun[i];
        if (!sRow[0]) continue;

        const isActive = (curTime >= sRow[1] && curTime < sRow[2]);
        sidebarHtml += `<div class="sidebar-item ${isActive ? 'active-session' : ''}"><div>${sRow[0]}</div><div class="sidebar-time-container"><div class="time-box">${sRow[1]}</div><div class="time-box">${sRow[2]}</div></div></div>`;
        
        if (isActive) {
            const lessonName = sRow[0].trim();
            // التحقق إذا كانت الحصة الحالية هي "فسحة"
            const isBreak = lessonName.includes("فسحة") || lessonName.includes("استراحة") || lessonName.includes("بريك");

            if (isBreak) {
                currentData = {
                    title: lessonName,
                    end: sRow[2],
                    html: `<div class="break-message">☕ وقت استراحة للطلاب</div>`
                };
            } else {
                // البحث عن المعلمين بالاسم (لحل مشكلة عدم وجود الفسحة في شيت المعلمين)
                let teachers = [];
                let sourceRow = null;

                if (dayName === "الأحد" || !rowsToday) {
                    sourceRow = sRow; // في يوم الأحد البيانات في نفس السطر
                } else {
                    // البحث في شيت اليوم عن سطر يبدأ بنفس اسم الحصة
                    sourceRow = rowsToday.find(r => r[0] && r[0].trim() === lessonName);
                }

                if (sourceRow) {
                    // الأحد يبدأ المعلمون من العمود 6، الأيام الأخرى من العمود 2
                    teachers = (dayName === "الأحد" || !rowsToday) ? sourceRow.slice(5) : sourceRow.slice(1);
                }

                let cards = "";
                classNames.forEach((n, idx) => {
                    cards += `<div class="class-card"><div class="class-name">${n}</div><div class="teacher-name"><div class="name-wrapper">${teachers[idx] || "---"}</div></div></div>`;
                });
                currentData = { title: "الحصة الآن: " + lessonName, end: sRow[2], html: cards };
            }
        }
    }

    document.getElementById('full-schedule-list').innerHTML = sidebarHtml;
    
    if (currentData) {
        document.getElementById('session-title').innerText = currentData.title;
        document.getElementById('teachers-list').innerHTML = currentData.html;
        setTimeout(adjustIndividualCardFonts, 100);
        startCountdown(currentData.end);
    } else {
        showNoSessionMode();
    }
}

// --- 3. وظيفة الخط الذكية (تمنع انكسار الكلمات وتصغر الخط) ---
function adjustIndividualCardFonts() {
    const cards = document.querySelectorAll('.class-card');
    cards.forEach(card => {
        const wrapper = card.querySelector('.name-wrapper');
        if (!wrapper) return;

        let fontSize = 2.0; 
        wrapper.style.fontSize = fontSize + "vw";
        wrapper.style.whiteSpace = "nowrap"; 
        wrapper.style.wordBreak = "keep-all";
        wrapper.style.display = "inline-block";

        // تقليل الخط إذا خرج عن حدود الكرت
        while (wrapper.scrollWidth > (card.clientWidth - 15) && fontSize > 0.5) {
            fontSize -= 0.05;
            wrapper.style.fontSize = fontSize + "vw";
        }
    });
}

// --- 4. المؤقت التنازلي ونظام الوقت ---
function startCountdown(end) {
    if (window.cdInt) clearInterval(window.cdInt);
    const [h, m] = end.split(':').map(Number);
    window.cdInt = setInterval(() => {
        const now = new Date(); const target = new Date(); target.setHours(h, m, 0);
        const diff = target - now;
        if (diff <= 0) { clearInterval(window.cdInt); initSystem(); }
        else {
            const min = Math.floor(diff / 60000); 
            const sec = Math.floor((diff % 60000) / 1000);
            document.getElementById('countdown-timer').innerText = `${min.toString().padStart(2,'0')}:${sec.toString().padStart(2,'0')}`;
        }
    }, 1000);
}

setInterval(() => {
    const now = new Date();
    let h = now.getHours();
    const ampm = h >= 12 ? 'م' : 'ص';
    h = h % 12 || 12;
    document.getElementById('digital-clock').innerHTML = `${h}:${now.getMinutes().toString().padStart(2,'0')}:${now.getSeconds().toString().padStart(2,'0')} <span style="font-size:0.5em;">${ampm}</span>`;
    const dateEl = document.getElementById('miladi-date');
    if(dateEl) dateEl.innerText = now.toLocaleDateString('ar-EG-u-nu-latn', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) + " م";
}, 1000);

// --- 5. وظائف مساعدة ---
async function updateTicker() {
    try {
        const res = await fetch(sheetUrls["العبارات"] + "&t=" + new Date().getTime());
        const rows = parseCSV(await res.text());
        let phrase = rows.slice(1).map(r => r[0]).filter(t => t).join("  •  ") + "  •  ";
        document.getElementById('ticker-text').innerText = phrase + phrase;
    } catch(e){}
}

function showWeekendMode() {
    document.getElementById('session-title').innerText = "عطلة نهاية أسبوع سعيدة";
    document.getElementById('teachers-list').innerHTML = "";
    document.getElementById('full-schedule-list').innerHTML = "<div style='text-align:center; padding:20px; color:var(--neon-cyan);'>لا يوجد حصص اليوم</div>";
    updateTicker();
}

function showNoSessionMode() {
    document.getElementById('session-title').innerText = "استراحة / نهاية اليوم";
    document.getElementById('teachers-list').innerHTML = "";
    document.getElementById('countdown-timer').innerText = "00:00";
}

window.onload = initSystem;
setInterval(initSystem, 300000); // تحديث البيانات كل 5 دقائق

document.addEventListener('click', () => {
    const elem = document.documentElement;
    if (elem.requestFullscreen) elem.requestFullscreen();
});

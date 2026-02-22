/**
 * نظام الجدول المدرسي الذكي - النسخة النهائية فائقة الدقة
 * --------------------------------------------------
 * الإصلاحات: 
 * 1. التبديل اللحظي (في الثانية 00 تماماً) عبر المقارنة الرقمية للدقائق.
 * 2. ثبات الساعة ومنع توقف الثواني.
 * 3. الالتزام بقاعدة الصفوف (الحصة X في الصف X+2).
 * 4. التنسيق المحفوظ للخط (No Word Break + Scale Down).
 */

const sheetUrls = {
    "الأحد": "https://docs.google.com/spreadsheets/d/e/2PACX-1vQcHAJak0bVPCbVvk2OWUs84l8YrXOqhBWVUSrgyHRVjqd_lJ30DzQKuemvziO0_zgA7lb9V0pLGKno/pub?gid=0&single=true&output=csv",
    "الإثنين": "https://docs.google.com/spreadsheets/d/e/2PACX-1vQcHAJak0bVPCbVvk2OWUs84l8YrXOqhBWVUSrgyHRVjqd_lJ30DzQKuemvziO0_zgA7lb9V0pLGKno/pub?gid=387606236&single=true&output=csv", 
    "الثلاثاء": "https://docs.google.com/spreadsheets/d/e/2PACX-1vQcHAJak0bVPCbVvk2OWUs84l8YrXOqhBWVUSrgyHRVjqd_lJ30DzQKuemvziO0_zgA7lb9V0pLGKno/pub?gid=2132518963&single=true&output=csv",
    "الأربعاء": "https://docs.google.com/spreadsheets/d/e/2PACX-1vQcHAJak0bVPCbVvk2OWUs84l8YrXOqhBWVUSrgyHRVjqd_lJ30DzQKuemvziO0_zgA7lb9V0pLGKno/pub?gid=1914161473&single=true&output=csv",
    "الخميس": "https://docs.google.com/spreadsheets/d/e/2PACX-1vQcHAJak0bVPCbVvk2OWUs84l8YrXOqhBWVUSrgyHRVjqd_lJ30DzQKuemvziO0_zgA7lb9V0pLGKno/pub?gid=1287360203&single=true&output=csv",
    "العبارات": "https://docs.google.com/spreadsheets/d/e/2PACX-1vQcHAJak0bVPCbVvk2OWUs84l8YrXOqhBWVUSrgyHRVjqd_lJ30DzQKuemvziO0_zgA7lb9V0pLGKno/pub?gid=1453340959&single=true&output=csv"
};

// ذاكرة النظام المؤقتة
let cachedRowsSun = null;
let cachedRowsToday = null;
let cachedPhrases = "";

// 1. وظيفة جلب البيانات من Google Sheets
async function fetchData() {
    const days = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
    const now = new Date();
    const dayName = days[now.getDay()];
    if (dayName === "الجمعة" || dayName === "السبت") return;

    try {
        const cacheBuster = "&t=" + Date.now();
        const resSun = await fetch(sheetUrls["الأحد"] + cacheBuster);
        cachedRowsSun = parseCSV(await resSun.text());
        
        if (dayName !== "الأحد") {
            const resDay = await fetch(sheetUrls[dayName] + cacheBuster);
            cachedRowsToday = parseCSV(await resDay.text());
        }

        try {
            const resP = await fetch(sheetUrls["العبارات"] + cacheBuster);
            const rowsP = parseCSV(await resP.text());
            cachedPhrases = rowsP.slice(1).map(r => r[0]).filter(t => t).join("  •  ") + "  •  ";
        } catch(e){}

        renderUI(); // رسم الواجهة فور اكتمال الجلب
    } catch (e) { console.error("خطأ في جلب البيانات:", e); }
}

function parseCSV(t) { return t.split('\n').map(r => r.split(',').map(c => c.replace(/"/g, '').trim())); }

// 2. وظيفة المعالجة والعرض (تعتمد على الدقائق الإجمالية)
function renderUI() {
    if (!cachedRowsSun) return;

    const days = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
    const now = new Date();
    const dayName = days[now.getDay()];
    
    // حساب الدقائق الإجمالية الحالية (مثلاً 08:30 = 8*60 + 30 = 510 دقيقة)
    const currentTotalMinutes = now.getHours() * 60 + now.getMinutes();
    
    document.getElementById('ticker-text').innerText = cachedPhrases + cachedPhrases;

    const classNames = cachedRowsSun[1].slice(5).filter(n => n);
    let sidebarHtml = `<div class="sidebar-top-headers"><span class="header-label-main">الحصة</span><div class="header-label-times"><span class="label-from">من</span><span class="label-to">إلى</span></div></div>`;
    
    let currentData = null;
    let lessonCounter = 0;

    for (let i = 2; i < cachedRowsSun.length; i++) {
        const sRow = cachedRowsSun[i];
        if (!sRow[0] || !sRow[1] || !sRow[2]) continue;

        const lessonName = sRow[0].trim();
        const isBreak = lessonName.includes("فسحة") || lessonName.includes("استراحة") || lessonName.includes("صلاة");

        // تحويل أوقات الشيت إلى دقائق إجمالية للمقارنة الدقيقة
        const [startH, startM] = sRow[1].split(':').map(Number);
        const [endH, endM] = sRow[2].split(':').map(Number);
        const startTotal = startH * 60 + startM;
        const endTotal = endH * 60 + endM;

        const isActive = (currentTotalMinutes >= startTotal && currentTotalMinutes < endTotal);

        if (!isBreak) lessonCounter++;

        sidebarHtml += `<div class="sidebar-item ${isActive ? 'active-session' : ''}">
            <div>${lessonName}</div>
            <div class="sidebar-time-container"><div class="time-box">${sRow[1]}</div><div class="time-box">${sRow[2]}</div></div>
        </div>`;
        
        if (isActive) {
            let teachers;
            const targetRowIndex = lessonCounter + 1; // قاعدة الصف X+2
            
            if (isBreak) {
                currentData = { title: lessonName, end: sRow[2], html: `<div class="break-msg-container">☕ وقت ${lessonName}</div>` };
            } else {
                if (dayName === "الأحد") {
                    teachers = cachedRowsSun[targetRowIndex] ? cachedRowsSun[targetRowIndex].slice(5) : [];
                } else {
                    teachers = cachedRowsToday && cachedRowsToday[targetRowIndex] ? cachedRowsToday[targetRowIndex].slice(1) : [];
                }
                
                let cards = "";
                classNames.forEach((n, idx) => {
                    cards += `<div class="class-card">
                        <div class="class-name">${n}</div>
                        <div class="teacher-name"><div class="name-wrapper">${teachers[idx] || "---"}</div></div>
                    </div>`;
                });
                currentData = { title: "الحصة الآن: " + lessonName, end: sRow[2], html: cards };
            }
        }
    }
    
    document.getElementById('full-schedule-list').innerHTML = sidebarHtml;
    
    if (currentData) {
        document.getElementById('session-title').innerText = currentData.title;
        document.getElementById('teachers-list').innerHTML = currentData.html;
        setTimeout(adjustIndividualCardFonts, 50);
        startCountdown(currentData.end);
    } else {
        document.getElementById('session-title').innerText = "بانتظار بدء الدوام";
        document.getElementById('teachers-list').innerHTML = "";
        document.getElementById('countdown-timer').innerText = "00:00";
    }
}

// 3. وظيفة الساعة (منع التوقف + التبديل في الثانية 00)
function startClock() {
    setInterval(() => {
        const now = new Date();
        const hours = now.getHours() % 12 || 12;
        const ampm = now.getHours() >= 12 ? 'م' : 'ص';
        document.getElementById('digital-clock').innerHTML = `${hours}:${now.getMinutes().toString().padStart(2,'0')}:${now.getSeconds().toString().padStart(2,'0')} <small>${ampm}</small>`;

        // تحديث التاريخ عند الثانية 00
        if (now.getSeconds() === 0) {
            const dateEl = document.getElementById('miladi-date');
            if (dateEl) dateEl.innerText = now.toLocaleDateString('ar-EG-u-nu-latn', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) + " م";
            
            // تبديل الحصة فوراً في الثانية 00
            renderUI();
        }
    }, 1000);
}

// 4. وظائف الضبط التلقائي
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
        while (wrapper.scrollWidth > card.clientWidth - 15 && fontSize > 0.5) {
            fontSize -= 0.05;
            wrapper.style.fontSize = fontSize + "vw";
        }
    });
}

function startCountdown(end) {
    if (window.cdInt) clearInterval(window.cdInt);
    const [h, m] = end.split(':').map(Number);
    window.cdInt = setInterval(() => {
        const now = new Date(); const target = new Date(); target.setHours(h, m, 0);
        const diff = target - now;
        if (diff <= 0) { clearInterval(window.cdInt); fetchData(); }
        else {
            const min = Math.floor(diff / 60000); 
            const sec = Math.floor((diff % 60000) / 1000);
            document.getElementById('countdown-timer').innerText = `${min.toString().padStart(2,'0')}:${sec.toString().padStart(2,'0')}`;
        }
    }, 1000);
}

// 5. الانطلاق
window.onload = () => {
    startClock();
    fetchData(); 
    const now = new Date();
    document.getElementById('miladi-date').innerText = now.toLocaleDateString('ar-EG-u-nu-latn', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) + " م";
};

setInterval(fetchData, 300000); // تحديث من الشيت كل 5 دقائق
window.addEventListener('resize', adjustIndividualCardFonts);
// الدخول في وضع ملء الشاشة عند أول نقرة
document.addEventListener('click', () => {
    const elem = document.documentElement;
    if (elem.requestFullscreen) elem.requestFullscreen();
    else if (elem.webkitRequestFullscreen) elem.webkitRequestFullscreen();
});
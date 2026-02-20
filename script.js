const sheetUrls = {
    "الأحد": "https://docs.google.com/spreadsheets/d/e/2PACX-1vQcHAJak0bVPCbVvk2OWUs84l8YrXOqhBWVUSrgyHRVjqd_lJ30DzQKuemvziO0_zgA7lb9V0pLGKno/pub?gid=0&single=true&output=csv",
    "الإثنين": "https://docs.google.com/spreadsheets/d/e/2PACX-1vQcHAJak0bVPCbVvk2OWUs84l8YrXOqhBWVUSrgyHRVjqd_lJ30DzQKuemvziO0_zgA7lb9V0pLGKno/pub?gid=387606236&single=true&output=csv", 
    "الثلاثاء": "https://docs.google.com/spreadsheets/d/e/2PACX-1vQcHAJak0bVPCbVvk2OWUs84l8YrXOqhBWVUSrgyHRVjqd_lJ30DzQKuemvziO0_zgA7lb9V0pLGKno/pub?gid=2132518963&single=true&output=csv",
    "الأربعاء": "https://docs.google.com/spreadsheets/d/e/2PACX-1vQcHAJak0bVPCbVvk2OWUs84l8YrXOqhBWVUSrgyHRVjqd_lJ30DzQKuemvziO0_zgA7lb9V0pLGKno/pub?gid=1914161473&single=true&output=csv",
    "الخميس": "https://docs.google.com/spreadsheets/d/e/2PACX-1vQcHAJak0bVPCbVvk2OWUs84l8YrXOqhBWVUSrgyHRVjqd_lJ30DzQKuemvziO0_zgA7lb9V0pLGKno/pub?gid=1287360203&single=true&output=csv",
    "العبارات": "https://docs.google.com/spreadsheets/d/e/2PACX-1vQcHAJak0bVPCbVvk2OWUs84l8YrXOqhBWVUSrgyHRVjqd_lJ30DzQKuemvziO0_zgA7lb9V0pLGKno/pub?gid=1453340959&single=true&output=csv"
};

async function initSystem() {
    const days = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
    const now = new Date();
    const dayName = days[now.getDay()];
    const cacheBuster = "&t=" + new Date().getTime();

    try {
        const resSun = await fetch(sheetUrls["الأحد"] + cacheBuster);
        const rowsSun = parseCSV(await resSun.text());

        let rowsToday = null;
        if (dayName !== "الأحد" && sheetUrls[dayName]) {
            const resDay = await fetch(sheetUrls[dayName] + cacheBuster);
            rowsToday = parseCSV(await resDay.text());
        }

        let phraseText = "مرحباً بكم في مدرستنا";
        try {
            const resPhrases = await fetch(sheetUrls["العبارات"] + cacheBuster);
            const rowsP = parseCSV(await resPhrases.text());
            phraseText = rowsP.slice(1).map(r => r[0]).filter(t => t).join("  •  ");
            phraseText = phraseText + "  •  " + phraseText; // تكرار النص لضمان سلاسة الأنيميشن
        } catch(e){}

        updateUI(rowsSun, rowsToday, dayName, phraseText);
    } catch (e) { console.error(e); }
}

function parseCSV(t) { return t.split('\n').map(r => r.split(',').map(c => c.replace(/"/g, '').trim())); }

function updateUI(rowsSun, rowsToday, dayName, phraseText) {
    const now = new Date();
    const curTime = now.getHours().toString().padStart(2,'0') + ":" + now.getMinutes().toString().padStart(2,'0');
    document.getElementById('ticker-text').innerText = phraseText;

    const classNames = rowsSun[1].slice(5).filter(n => n);
    
    // إعداد رؤوس الأعمدة في السايد بار (تظهر مرة واحدة فقط)
    let sidebarHtml = `
        <div class="sidebar-top-headers">
            <span class="header-label-main">الحصة</span>
            <div class="header-label-times">
                <span class="label-from">من</span>
                <span class="label-to">إلى</span>
            </div>
        </div>`;

    let currentData = null;

    for (let i = 2; i < rowsSun.length; i++) {
        const sRow = rowsSun[i];
        if (!sRow[0]) continue;
        
        const isActive = (curTime >= sRow[1] && curTime < sRow[2]);

        sidebarHtml += `
            <div class="sidebar-item ${isActive ? 'active-session' : ''}">
                <div>${sRow[0]}</div>
                <div class="sidebar-time-container">
                    <div class="time-box">${sRow[1]}</div>
                    <div class="time-box">${sRow[2]}</div>
                </div>
            </div>`;

        if (isActive) {
            let teachers = [];
            // إصلاح الإزاحة: نستخدم [i - 1] لضبط الصف الصحيح للمعلمين
            if (dayName === "الأحد" || !rowsToday) {
                const targetRow = rowsSun[i - 1]; 
                teachers = targetRow ? targetRow.slice(5) : [];
            } else {
                const targetRow = rowsToday[i - 1]; 
                if (targetRow) {
                    teachers = targetRow.slice(1); 
                }
            }

            let cards = "";
            classNames.forEach((n, idx) => {
                cards += `<div class="class-card">
                            <div class="class-name">${n}</div>
                            <div class="teacher-name">${teachers[idx] || "---"}</div>
                          </div>`;
            });
            currentData = { title: sRow[0], end: sRow[2], html: cards };
        }
    }

    document.getElementById('full-schedule-list').innerHTML = sidebarHtml;
    
    if (currentData) {
        document.getElementById('session-title').innerText = currentData.title;
        document.getElementById('teachers-list').innerHTML = currentData.html;
        startCountdown(currentData.end);
    } else {
        document.getElementById('session-title').innerText = "استراحة / نهاية اليوم";
        document.getElementById('teachers-list').innerHTML = "";
        document.getElementById('countdown-timer').innerText = "00:00";
    }
}

function startCountdown(end) {
    if (window.cdInt) clearInterval(window.cdInt);
    const [h, m] = end.split(':').map(Number);
    window.cdInt = setInterval(() => {
        const now = new Date(); const target = new Date(); target.setHours(h, m, 0);
        const diff = target - now;
        if (diff <= 0) { 
            clearInterval(window.cdInt); 
            initSystem(); 
        } else {
            const min = Math.floor(diff / 60000); 
            const sec = Math.floor((diff % 60000) / 1000);
            document.getElementById('countdown-timer').innerText = `${min.toString().padStart(2,'0')}:${sec.toString().padStart(2,'0')}`;
        }
    }, 1000);
}

// تحديث الساعة والتاريخ (أرقام إنجليزية)
setInterval(() => {
    const now = new Date();
    
    // إعدادات الساعة الجديدة بنظام 12
    let hours = now.getHours();
    let minutes = now.getMinutes();
    let seconds = now.getSeconds();
    
    // تحديد ص أو م
    const ampm = hours >= 12 ? 'م' : 'ص';
    
    // تحويل الساعات إلى نظام 12
    hours = hours % 12;
    hours = hours ? hours : 12; // الساعة 0 (منتصف الليل) تصبح 12
    
    // إضافة صفر قبل الأرقام الفردية (مثلاً 09 بدلاً من 9)
    hours = hours.toString().padStart(2, '0');
    minutes = minutes.toString().padStart(2, '0');
    seconds = seconds.toString().padStart(2, '0');
    
    // تنسيق الساعة مع تصغير حجم حرف "ص/م" لجمالية العرض
    // استخدام innerHTML بدلاً من innerText لكي يعمل تنسيق الـ span
    document.getElementById('digital-clock').innerHTML = `${hours}:${minutes}:${seconds} <span style="font-size: 0.4em; color: var(--neon-gold);">${ampm}</span>`;

    // تحديث التاريخ
    const options = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
    const dateEl = document.getElementById('miladi-date');
    if(dateEl) dateEl.innerText = now.toLocaleDateString('ar-EG-u-nu-latn', options);
}, 1000);

// تحديث النظام كل 5 دقائق
setInterval(initSystem, 300000);
window.onload = initSystem;

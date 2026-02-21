/**
 * نظام الجدول المدرسي الذكي - النسخة النهائية
 * الميزات: منع كسر الكلمات، نظام 12 ساعة، دعم الزووم، والتعامل مع أيام العطلة
 */

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

    // --- إضافة شرط العطلة هنا ---
    if (dayName === "الجمعة" || dayName === "السبت") {
        document.getElementById('session-title').innerText = "عطلة نهاية أسبوع سعيدة";
        document.getElementById('teachers-list').innerHTML = "";
        document.getElementById('countdown-timer').innerText = "00:00";
        document.getElementById('full-schedule-list').innerHTML = "<div style='text-align:center; padding:20px; color:var(--neon-cyan);'>لا يوجد حصص اليوم</div>";
        
        // جلب العبارات فقط لتحديث شريط الأخبار حتى في الإجازة
        updateTickerOnly(); 
        return; 
    }

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
            phraseText = rowsP.slice(1).map(r => r[0]).filter(t => t).join("  •  ") + "  •  ";
            phraseText += phraseText; 
        } catch(e){}
        updateUI(rowsSun, rowsToday, dayName, phraseText);
    } catch (e) { console.error(e); }
}

// دالة لتحديث شريط الأخبار فقط أيام العطلة
async function updateTickerOnly() {
    try {
        const resPhrases = await fetch(sheetUrls["العبارات"] + "&t=" + new Date().getTime());
        const rowsP = parseCSV(await resPhrases.text());
        let phraseText = rowsP.slice(1).map(r => r[0]).filter(t => t).join("  •  ") + "  •  ";
        document.getElementById('ticker-text').innerText = phraseText + phraseText;
    } catch(e){}
}

function parseCSV(t) { return t.split('\n').map(r => r.split(',').map(c => c.replace(/"/g, '').trim())); }

function updateUI(rowsSun, rowsToday, dayName, phraseText) {
    const now = new Date();
    const curTime = now.getHours().toString().padStart(2,'0') + ":" + now.getMinutes().toString().padStart(2,'0');
    document.getElementById('ticker-text').innerText = phraseText;

    const classNames = rowsSun[1].slice(5).filter(n => n);
    let sidebarHtml = `<div class="sidebar-top-headers"><span class="header-label-main">الحصة</span><div class="header-label-times"><span class="label-from">من</span><span class="label-to">إلى</span></div></div>`;

    let currentData = null;
    for (let i = 2; i < rowsSun.length; i++) {
        const sRow = rowsSun[i];
        if (!sRow[0]) continue;
        const isActive = (curTime >= sRow[1] && curTime < sRow[2]);
        sidebarHtml += `<div class="sidebar-item ${isActive ? 'active-session' : ''}"><div>${sRow[0]}</div><div class="sidebar-time-container"><div class="time-box">${sRow[1]}</div><div class="time-box">${sRow[2]}</div></div></div>`;
        if (isActive) {
            let teachers = [];
            let sourceRow = (dayName === "الأحد" || !rowsToday) ? rowsSun[i-1] : rowsToday[i-1];
            teachers = sourceRow ? ((dayName === "الأحد" || !rowsToday) ? sourceRow.slice(5) : sourceRow.slice(1)) : [];
            let cards = "";
            classNames.forEach((n, idx) => {
                cards += `<div class="class-card"><div class="class-name">${n}</div><div class="teacher-name"><div class="name-wrapper">${teachers[idx] || "---"}</div></div></div>`;
            });
            currentData = { title: "الحصة الأن: " + sRow[0], end: sRow[2], html: cards };
        }
    }
    document.getElementById('full-schedule-list').innerHTML = sidebarHtml;
    if (currentData) {
        document.getElementById('session-title').innerText = currentData.title;
        document.getElementById('teachers-list').innerHTML = currentData.html;
        setTimeout(adjustIndividualCardFonts, 50);
        startCountdown(currentData.end);
    } else {
        document.getElementById('session-title').innerText = "استراحة / نهاية اليوم";
        document.getElementById('teachers-list').innerHTML = "";
        document.getElementById('countdown-timer').innerText = "00:00";
    }
}

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
    let hours = now.getHours();
    const ampm = hours >= 12 ? 'م' : 'ص';
    hours = hours % 12 || 12;
    const timeString = `${hours}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')} <span style="font-size: 0.5em;">${ampm}</span>`;
    document.getElementById('digital-clock').innerHTML = timeString;
    const dateEl = document.getElementById('miladi-date');
    if(dateEl) dateEl.innerText = now.toLocaleDateString('ar-EG-u-nu-latn', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) + " م";
}, 1000);

window.addEventListener('resize', adjustIndividualCardFonts);
window.onload = initSystem;
setInterval(initSystem, 300000);

function openFullscreen() {
    const elem = document.documentElement; // استهداف الصفحة كاملة
    if (elem.requestFullscreen) {
        elem.requestFullscreen();
    } else if (elem.webkitRequestFullscreen) { /* Safari */
        elem.webkitRequestFullscreen();
    } else if (elem.msRequestFullscreen) { /* IE11 */
        elem.msRequestFullscreen();
    }

}
// عند النقر في أي مكان على الشاشة، ادخل وضع ملء الشاشة
document.addEventListener('click', () => {
    openFullscreen();
});

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
    
    let sidebarHtml = `<div class="sidebar-top-headers"><span class="header-label-main">الحصة</span><div class="header-label-times"><span class="label-from">من</span><span class="label-to">إلى</span></div></div>`;

    let currentData = null;

    for (let i = 2; i < rowsSun.length; i++) {
        const sRow = rowsSun[i];
        if (!sRow[0]) continue;
        const isActive = (curTime >= sRow[1] && curTime < sRow[2]);

        sidebarHtml += `<div class="sidebar-item ${isActive ? 'active-session' : ''}"><div>${sRow[0]}</div><div class="sidebar-time-container"><div class="time-box">${sRow[1]}</div><div class="time-box">${sRow[2]}</div></div></div>`;

        if (isActive) {
            let teachers = [];
            let targetRow = (dayName === "الأحد" || !rowsToday) ? rowsSun[i-1] : rowsToday[i-1];
            teachers = targetRow ? (dayName === "الأحد" || !rowsToday ? targetRow.slice(5) : targetRow.slice(1)) : [];

            let cards = "";
            classNames.forEach((n, idx) => {
                cards += `<div class="class-card"><div class="class-name">${n}</div><div class="teacher-name">${teachers[idx] || "---"}</div></div>`;
            });
            currentData = { title: sRow[0], end: sRow[2], html: cards };
        }
    }

    document.getElementById('full-schedule-list').innerHTML = sidebarHtml;
    
    if (currentData) {
        document.getElementById('session-title').innerText = currentData.title;
        const tList = document.getElementById('teachers-list');
        tList.innerHTML = currentData.html;
        setTimeout(adjustTeacherFontSizes, 50); // تصغير الخط تلقائياً
        startCountdown(currentData.end);
    }
}

function adjustTeacherFontSizes() {
    const names = document.querySelectorAll('.teacher-name');
    names.forEach(el => {
        const parent = el.parentElement;
        let size = 2.2; // البداية بالـ vw
        el.style.fontSize = size + 'vw';
        while (el.scrollHeight > parent.clientHeight - 35 && size > 0.8) {
            size -= 0.1;
            el.style.fontSize = size + 'vw';
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
            const min = Math.floor(diff / 60000); const sec = Math.floor((diff % 60000) / 1000);
            document.getElementById('countdown-timer').innerText = `${min.toString().padStart(2,'0')}:${sec.toString().padStart(2,'0')}`;
        }
    }, 1000);
}

// الساعة والتاريخ
setInterval(() => {
    const now = new Date();
    let h = now.getHours(); const m = now.getMinutes().toString().padStart(2,'0'); const s = now.getSeconds().toString().padStart(2,'0');
    const ampm = h >= 12 ? 'م' : 'ص';
    h = h % 12 || 12;
    document.getElementById('digital-clock').innerHTML = `${h}:${m}:${s} <span style="font-size:0.4em; color:var(--neon-gold)">${ampm}</span>`;
    
    const options = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
    document.getElementById('miladi-date').innerText = now.toLocaleDateString('ar-EG', options);
}, 1000);

window.onload = initSystem;
setInterval(initSystem, 300000);
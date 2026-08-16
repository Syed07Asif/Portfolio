const ICONS = {
  github: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 .5C5.65.5.5 5.66.5 12.03c0 5.1 3.29 9.42 7.86 10.95.57.1.78-.25.78-.55 0-.27-.01-1.17-.02-2.12-3.2.7-3.88-1.36-3.88-1.36-.52-1.34-1.28-1.7-1.28-1.7-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.2 1.77 1.2 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.7 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.8 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.24 2.76.12 3.05.74.81 1.18 1.84 1.18 3.1 0 4.43-2.69 5.4-5.25 5.69.42.36.78 1.08.78 2.18 0 1.57-.01 2.84-.01 3.23 0 .3.2.66.79.55A10.53 10.53 0 0 0 23.5 12.03C23.5 5.66 18.35.5 12 .5Z"/></svg>',
  linkedin: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.34V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.38-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.07 2.07 0 1 1 0-4.13 2.07 2.07 0 0 1 0 4.13ZM7.12 20.45H3.56V9h3.56v11.45ZM22.22 0H1.77C.8 0 0 .78 0 1.75v20.5C0 23.22.8 24 1.77 24h20.45c.98 0 1.78-.78 1.78-1.75V1.75C24 .78 23.2 0 22.22 0Z"/></svg>',
  mail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m2 7 10 6 10-6"/></svg>',
  external: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><path d="M15 3h6v6"/><path d="M10 14 21 3"/></svg>'
};

async function loadData() {
  const res = await fetch('data/data.json');
  return res.json();
}

function renderHero(data) {
  const { basicInfo, contact } = data;
  document.getElementById('heroName').textContent = basicInfo.name;
  document.getElementById('heroTitle').textContent = basicInfo.title;
  document.getElementById('heroBio').textContent = basicInfo.shortBio;

  const social = document.getElementById('socialLinks');
  social.innerHTML = `
    <a href="${contact.github}" target="_blank" rel="noopener" aria-label="GitHub">${ICONS.github}</a>
    <a href="${contact.linkedin}" target="_blank" rel="noopener" aria-label="LinkedIn">${ICONS.linkedin}</a>
    <a href="mailto:${contact.email}" aria-label="Email">${ICONS.mail}</a>
  `;
}

function renderAbout(data) {
  const { basicInfo } = data;
  document.getElementById('aboutText').textContent = basicInfo.aboutMe;
  document.getElementById('aboutLocation').textContent = `📍 ${basicInfo.location}`;
  document.getElementById('aboutNationality').textContent = `🌏 ${basicInfo.nationality}`;
  const photo = document.getElementById('aboutPhoto');
  photo.src = basicInfo.photo;
  photo.alt = basicInfo.name;
}

function renderSkills(data) {
  const grid = document.getElementById('skillsGrid');
  grid.innerHTML = Object.entries(data.skills).map(([category, items]) => `
    <div class="skill-card">
      <h3>${category}</h3>
      <div class="skill-tags">
        ${items.map(s => `<span class="skill-tag">${s}</span>`).join('')}
      </div>
    </div>
  `).join('');
}

function renderProjects(data) {
  const grid = document.getElementById('projectsGrid');
  grid.innerHTML = data.projects.map(p => `
    <div class="project-card">
      <div class="project-icon">${p.title.charAt(0)}</div>
      <h3>${p.title}</h3>
      <ul>${p.description.map(d => `<li>${d}</li>`).join('')}</ul>
      <div class="project-tech">${p.tech.map(t => `<span>${t}</span>`).join('')}</div>
      <div class="project-links">
        ${p.githubUrl ? `<a href="${p.githubUrl}" target="_blank" rel="noopener">${ICONS.github} Code</a>` : ''}
        ${p.liveUrl ? `<a href="${p.liveUrl}" target="_blank" rel="noopener">${ICONS.external} Live Demo</a>` : ''}
      </div>
    </div>
  `).join('');
}

function renderExperience(data) {
  const el = document.getElementById('experienceTimeline');
  el.innerHTML = data.experience.map(e => `
    <div class="timeline-item">
      <h3>${e.role}</h3>
      <span class="org">${e.company}</span>
      <span class="duration">${e.duration}</span>
      <ul>${e.points.map(pt => `<li>${pt}</li>`).join('')}</ul>
    </div>
  `).join('');
}

function renderEducation(data) {
  const el = document.getElementById('educationTimeline');
  el.innerHTML = data.education.map(ed => `
    <div class="timeline-item">
      <h3>${ed.degree}</h3>
      <span class="org">${ed.institution}</span>
      <span class="duration">${ed.duration}${ed.showCgpa && ed.cgpa ? ' · CGPA: ' + ed.cgpa : ''}</span>
    </div>
  `).join('');
}

function renderContact(data) {
  const { contact } = data;
  const el = document.getElementById('contactLinks');
  el.innerHTML = `
    <a href="mailto:${contact.email}">${ICONS.mail} ${contact.email}</a>
    <a href="${contact.linkedin}" target="_blank" rel="noopener">${ICONS.linkedin} LinkedIn</a>
    <a href="${contact.github}" target="_blank" rel="noopener">${ICONS.github} GitHub</a>
  `;
}

function setupNav() {
  const toggle = document.getElementById('navToggle');
  const links = document.getElementById('navLinks');
  toggle.addEventListener('click', () => {
    const isOpen = links.classList.toggle('open');
    toggle.setAttribute('aria-expanded', isOpen);
  });
  links.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
    links.classList.remove('open');
    toggle.setAttribute('aria-expanded', false);
  }));
}

function applyAccentColor(data) {
  if (data.design && data.design.accentColor) {
    document.documentElement.style.setProperty('--accent', data.design.accentColor);
  }
}

async function init() {
  try {
    const data = await loadData();
    applyAccentColor(data);
    renderHero(data);
    renderAbout(data);
    renderSkills(data);
    renderProjects(data);
    renderExperience(data);
    renderEducation(data);
    renderContact(data);
  } catch (err) {
    console.error('Failed to load portfolio data:', err);
  }
  setupNav();
  document.getElementById('year').textContent = new Date().getFullYear();
}

init();

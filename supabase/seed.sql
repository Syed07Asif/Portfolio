-- Local/dev seed data: one placeholder row per content table so the site has
-- something to render once the frontend starts reading from these tables.
-- Run automatically by `supabase db reset`; safe to re-run against a fresh
-- database (not idempotent against a database that already has rows).

-- 1. profile
insert into public.profile
  (full_name, headline, short_bio, long_bio, avatar_url, location, availability_status, "current_role", tagline)
values (
  'Syed Asif',
  'Analytics & ML Engineer',
  'I build data pipelines and machine learning systems that turn raw data into decisions.',
  'I''m a B.Tech graduate in Artificial Intelligence & Data Science, and what pulled me into this field wasn''t a single algorithm — it was realizing how much a model''s output could change a real decision once it left the notebook. That gap between "the metrics looked good" and "this is actually trustworthy in production" is what I''ve spent my degree, and every project since, trying to close.

My work sits at the intersection of data engineering and machine learning: pipelines that hold up under real data, models that generalize past their training set, and dashboards people actually open a second time. I''m especially drawn to the less glamorous middle of the ML lifecycle — feature stability, monitoring, the handoff from experiment to something running unattended — because that''s usually where value is won or lost.

Right now I''m focused on growing as an Analytics & ML Engineer: building the engineering discipline that keeps machine learning systems reliable, while staying close enough to the analytics side to know whether a model is actually solving the right problem. Longer term, I want to be the person a team trusts to take an ML idea from a promising notebook to something dependable enough to run in production — and to keep learning the parts of this field no single course ever fully covers.',
  '/images/avatar.jpg',
  'India',
  'Open to opportunities',
  'Analytics & ML Engineer',
  'Turning data into decisions.'
);

-- 2. skill_categories
insert into public.skill_categories (id, name, slug, description, icon, display_order)
values (
  '10000000-0000-4000-8000-000000000001',
  'Machine Learning',
  'machine-learning',
  'Modeling, training, and deploying machine learning systems.',
  'brain-circuit',
  0
);

-- 3. skills
insert into public.skills (category_id, name, icon, proficiency, display_order, published)
values (
  '10000000-0000-4000-8000-000000000001',
  'Python',
  'code',
  90,
  0,
  true
);

-- 4. experience
insert into public.experience
  (company, role, company_logo_url, location, employment_type, start_date, end_date, is_current, description, responsibilities, technologies, link_url, display_order, published)
values (
  'Example Analytics Co.',
  'Analytics & ML Engineer',
  '/images/companies/example-analytics-co.png',
  'Remote',
  'Full-time',
  '2023-01-01',
  null,
  true,
  'Build and maintain the machine learning systems and analytics pipelines behind the product.',
  array['Designed and shipped ML models into production', 'Built ETL pipelines for analytics dashboards', 'Partnered with product on data-driven feature decisions'],
  array['Python', 'SQL', 'Airflow', 'scikit-learn'],
  'https://example.com',
  0,
  true
);

-- 5. education
insert into public.education
  (institution, degree, field_of_study, institution_logo_url, start_date, end_date, grade, description, link_url, display_order, published)
values (
  'Example University',
  'B.Tech',
  'Artificial Intelligence & Data Science',
  '/images/institutions/example-university.png',
  '2019-08-01',
  '2023-05-31',
  '8.5 CGPA',
  'Coursework spanning machine learning, statistics, data structures & algorithms, and database systems, capped off with a final-year project applying ML to a real dataset end-to-end.',
  'https://example.edu',
  0,
  true
);

-- 6. projects
insert into public.projects
  (id, slug, name, short_description, description, problem_statement, solution, purpose, logo_url, cover_image_url, github_url, demo_url, video_url, status, start_date, end_date, featured, display_order, published)
values (
  '20000000-0000-4000-8000-000000000001',
  'customer-churn-prediction',
  'Customer Churn Prediction',
  'A machine learning system that predicts which customers are likely to churn.',
  'An end-to-end pipeline that ingests customer usage data, trains a churn model, and serves predictions to the customer success team.',
  'The customer success team had no way to prioritize outreach before a customer churned.',
  'Built a feature pipeline and gradient-boosted model that scores every customer weekly, surfaced through a simple dashboard.',
  'Give customer success a ranked list of at-risk accounts to reach out to.',
  '/images/projects/customer-churn-prediction/logo.png',
  '/images/projects/customer-churn-prediction/cover.png',
  'https://github.com/example/customer-churn-prediction',
  'https://demo.example.com/churn',
  null,
  'completed',
  '2024-01-01',
  '2024-04-01',
  true,
  0,
  true
);

-- 7. project_technologies
insert into public.project_technologies (project_id, name, icon, display_order)
values (
  '20000000-0000-4000-8000-000000000001',
  'scikit-learn',
  'code',
  0
);

-- 8. project_features
insert into public.project_features (project_id, title, description, display_order)
values (
  '20000000-0000-4000-8000-000000000001',
  'Automated weekly retraining',
  'The model retrains on a schedule and the pipeline flags data drift before it affects predictions.',
  0
);

-- 9. project_media
insert into public.project_media (project_id, file_url, storage_path, media_type, title, alt_text, caption, display_order)
values (
  '20000000-0000-4000-8000-000000000001',
  '/images/projects/customer-churn-prediction/dashboard.png',
  'project-media/customer-churn-prediction/dashboard.png',
  'image',
  'Churn risk dashboard',
  'Screenshot of the churn risk dashboard showing a ranked list of at-risk customers',
  'The dashboard the customer success team uses to prioritize outreach.',
  0
);

-- 10. certifications
insert into public.certifications
  (name, issuing_organization, organization_logo_url, issue_date, expiration_date, credential_id, credential_url, certificate_file_url, description, display_order, published)
values (
  'AWS Certified Machine Learning – Specialty',
  'Amazon Web Services',
  '/images/organizations/aws.png',
  '2024-06-01',
  '2027-06-01',
  'AWS-MLS-000000',
  'https://www.credly.com/badges/example',
  '/documents/certifications/aws-ml-specialty.pdf',
  'Validates expertise in building, training, tuning, and deploying machine learning models on AWS.',
  0,
  true
);

-- 11. achievements
insert into public.achievements
  (title, description, date, organization, image_url, document_url, external_link, display_order, published)
values (
  'Published research paper on time-series forecasting',
  'Co-authored a paper on demand forecasting techniques, presented at a departmental research symposium.',
  '2023-03-15',
  'Example University',
  '/images/achievements/research-paper.png',
  '/documents/achievements/time-series-forecasting-paper.pdf',
  'https://example.edu/research/example-paper',
  0,
  true
);

-- 12. blog_posts (reserved for future use — no UI reads this table yet)
insert into public.blog_posts
  (title, slug, excerpt, content, cover_image_url, category, tags, author, reading_time, published_at, status, display_order)
values (
  'Getting Started with Feature Stores',
  'getting-started-with-feature-stores',
  'Why feature stores matter once you have more than one model in production.',
  'Draft content to be written.',
  '/images/blog/getting-started-with-feature-stores/cover.png',
  'Machine Learning',
  array['feature-stores', 'mlops'],
  'Syed Asif',
  6,
  null,
  'draft',
  0
);

-- 13. contact_links
insert into public.contact_links (label, type, value, url, icon, display_order, published)
values (
  'Email',
  'email',
  'Syedasif0024@gmail.com',
  'mailto:Syedasif0024@gmail.com',
  'mail',
  0,
  true
);

-- 14. resumes
insert into public.resumes (file_url, storage_path, version_label, is_active, uploaded_at)
values (
  '/documents/resume/syed-asif-resume-v1.pdf',
  'resumes/syed-asif-resume-v1.pdf',
  'v1',
  true,
  now()
);

-- 15. site_settings
insert into public.site_settings
  (site_title, meta_description, og_image_url, primary_nav, feature_flags, analytics_enabled)
values (
  'Syed Asif — Analytics & ML Engineer',
  'Portfolio of Syed Asif, an Analytics & ML Engineer building data pipelines and machine learning systems.',
  '/images/og-cover.png',
  '[
    {"label": "About", "href": "#about"},
    {"label": "Projects", "href": "#projects"},
    {"label": "Experience", "href": "#experience"},
    {"label": "Contact", "href": "#contact"}
  ]'::jsonb,
  '{"blog_enabled": false}'::jsonb,
  false
);

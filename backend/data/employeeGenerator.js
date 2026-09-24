const firstNames = [
  'Aarav', 'Ishita', 'Kabir', 'Maya', 'Vihaan', 'Tara', 'Aditya', 'Riya', 'Dev', 'Anika',
  'Neil', 'Sara', 'Yash', 'Diya', 'Arnav', 'Mira', 'Ritvik', 'Ira', 'Nikhil', 'Zoya',
  'Ayan', 'Kiara', 'Ravi', 'Aditi', 'Manav', 'Tanvi', 'Kunal', 'Shreya', 'Omkar', 'Lavanya',
  'Dhruv', 'Simran', 'Varun', 'Pallavi', 'Harsh', 'Nandini', 'Abhinav', 'Kritika', 'Siddharth', 'Meenal',
  'Anirudh', 'Bhavna', 'Chirag', 'Esha', 'Gaurav', 'Hema', 'Jatin', 'Jyoti', 'Madhav', 'Navya',
  'Parth', 'Radhika', 'Sahil', 'Sonali', 'Tarun', 'Uma', 'Vivek', 'Yamini', 'Zubin', 'Aarohi',
];

const lastNames = [
  'Sharma', 'Patel', 'Iyer', 'Nair', 'Kapoor', 'Reddy', 'Mehta', 'Joshi', 'Menon', 'Verma',
  'Rao', 'Bose', 'Malhotra', 'Pillai', 'Saxena', 'Das', 'Bhat', 'Chawla', 'Desai', 'Ghosh',
  'Khan', 'Kulkarni', 'Mishra', 'Mukherjee', 'Naidu', 'Prasad', 'Sethi', 'Singh', 'Srinivasan', 'Thakur',
  'Varma', 'Agarwal', 'Banerjee', 'Chopra', 'Dutta', 'Garg', 'Jain', 'Kaur', 'Lal', 'Mohan',
  'Pandey', 'Roy', 'Shetty', 'Tiwari', 'Trivedi', 'Venkatesh', 'Yadav', 'Bansal', 'Bhatt', 'Dixit',
];

const locations = ['Chennai', 'Bangalore', 'Hyderabad', 'Mumbai', 'Delhi', 'Pune', 'Kochi', 'Coimbatore', 'Madurai', 'Trichy', 'Ahmedabad', 'Noida', 'Gurgaon', 'Kolkata', 'Visakhapatnam'];
const departments = [
  { name: 'IT', category: 'IT', roles: ['IT Manager', 'Systems Analyst', 'IT Executive'], skills: ['IT Service Management', 'Networking', 'Troubleshooting'] },
  { name: 'Software Engineering', category: 'IT', roles: ['Software Engineer', 'Senior Software Engineer', 'Technical Lead'], skills: ['JavaScript', 'TypeScript', 'Java', 'Git'] },
  { name: 'Web Development', category: 'IT', roles: ['Frontend Developer', 'Backend Developer', 'Full Stack Developer'], skills: ['React', 'Node.js', 'HTML', 'CSS'] },
  { name: 'Mobile App Development', category: 'IT', roles: ['Mobile Developer', 'Android Developer', 'iOS Developer'], skills: ['Kotlin', 'Swift', 'Flutter', 'Mobile UI'] },
  { name: 'AI & Machine Learning', category: 'IT', roles: ['AI Engineer', 'Machine Learning Engineer', 'NLP Engineer'], skills: ['Python', 'Machine Learning', 'TensorFlow', 'NLP'] },
  { name: 'Data Science', category: 'IT', roles: ['Data Scientist', 'Data Analyst', 'Research Scientist'], skills: ['Python', 'SQL', 'Statistics', 'Power BI'] },
  { name: 'Data Engineering', category: 'IT', roles: ['Data Engineer', 'ETL Developer', 'Analytics Engineer'], skills: ['Python', 'Spark', 'SQL', 'Data Warehousing'] },
  { name: 'Cybersecurity', category: 'IT', roles: ['Cybersecurity Analyst', 'Security Engineer', 'Incident Responder'], skills: ['Network Security', 'SIEM', 'Penetration Testing', 'Cloud Security'] },
  { name: 'Cloud & DevOps', category: 'IT', roles: ['Cloud Engineer', 'DevOps Engineer', 'Site Reliability Engineer'], skills: ['AWS', 'Docker', 'Kubernetes', 'CI/CD'] },
  { name: 'QA & Testing', category: 'IT', roles: ['QA Engineer', 'Automation Tester', 'Test Lead'], skills: ['Selenium', 'Test Automation', 'API Testing', 'Jira'] },
  { name: 'UI/UX Design', category: 'IT', roles: ['UI Designer', 'UX Designer', 'UX Researcher'], skills: ['Figma', 'Wireframing', 'User Research', 'Prototyping'] },
  { name: 'Product Management', category: 'IT', roles: ['Product Manager', 'Associate Product Manager', 'Product Owner'], skills: ['Roadmapping', 'Agile', 'Market Research', 'Jira'] },
  { name: 'Project Management', category: 'IT', roles: ['Project Manager', 'Program Manager', 'Scrum Master'], skills: ['Planning', 'Agile', 'Risk Management', 'Leadership'] },
  { name: 'Human Resources', category: 'Non-IT', roles: ['HR Manager', 'HR Executive', 'HR Business Partner'], skills: ['Employee Relations', 'Payroll', 'Talent Management', 'HRIS'] },
  { name: 'Recruitment', category: 'Non-IT', roles: ['Recruiter', 'Talent Acquisition Specialist', 'Recruitment Lead'], skills: ['Recruitment', 'Sourcing', 'Interviewing', 'Onboarding'] },
  { name: 'Finance', category: 'Non-IT', roles: ['Finance Manager', 'Financial Analyst', 'Finance Executive'], skills: ['Financial Analysis', 'Forecasting', 'Budgeting', 'Excel'] },
  { name: 'Accounting', category: 'Non-IT', roles: ['Accountant', 'Senior Accountant', 'Accounts Executive'], skills: ['Accounting', 'Taxation', 'Ledger Management', 'Excel'] },
  { name: 'Sales', category: 'Non-IT', roles: ['Sales Manager', 'Sales Executive', 'Account Executive'], skills: ['CRM', 'Negotiation', 'Lead Generation', 'Communication'] },
  { name: 'Marketing', category: 'Non-IT', roles: ['Marketing Manager', 'Marketing Executive', 'Brand Manager'], skills: ['Brand Strategy', 'Campaigns', 'Market Research', 'Communication'] },
  { name: 'Digital Marketing', category: 'Non-IT', roles: ['Digital Marketing Specialist', 'SEO Specialist', 'Social Media Manager'], skills: ['SEO', 'SEM', 'Content Marketing', 'Social Media'] },
  { name: 'Business Development', category: 'Non-IT', roles: ['Business Development Executive', 'Growth Manager', 'Partnership Manager'], skills: ['Lead Generation', 'Partnerships', 'Negotiation', 'CRM'] },
  { name: 'Customer Support', category: 'Non-IT', roles: ['Customer Support Executive', 'Support Specialist', 'Support Team Lead'], skills: ['Communication', 'Ticketing', 'Problem Solving', 'CRM'] },
  { name: 'Customer Success', category: 'Non-IT', roles: ['Customer Success Manager', 'Success Executive', 'Onboarding Specialist'], skills: ['Customer Relations', 'Onboarding', 'Account Management', 'Communication'] },
  { name: 'Operations', category: 'Non-IT', roles: ['Operations Manager', 'Operations Executive', 'Process Analyst'], skills: ['Process Design', 'Reporting', 'Team Coordination', 'Excel'] },
  { name: 'Administration', category: 'Non-IT', roles: ['Administration Manager', 'Admin Executive', 'Office Coordinator'], skills: ['Scheduling', 'Documentation', 'Vendor Management', 'Communication'] },
  { name: 'Legal', category: 'Non-IT', roles: ['Legal Advisor', 'Legal Executive', 'Contracts Specialist'], skills: ['Contract Law', 'Compliance', 'Legal Research', 'Negotiation'] },
  { name: 'Procurement', category: 'Non-IT', roles: ['Procurement Manager', 'Procurement Executive', 'Vendor Specialist'], skills: ['Vendor Management', 'Sourcing', 'Negotiation', 'ERP'] },
  { name: 'Supply Chain', category: 'Non-IT', roles: ['Supply Chain Analyst', 'Supply Chain Manager', 'Inventory Planner'], skills: ['Supply Planning', 'Inventory', 'Forecasting', 'Excel'] },
  { name: 'Logistics', category: 'Non-IT', roles: ['Logistics Coordinator', 'Logistics Manager', 'Dispatch Executive'], skills: ['Logistics', 'Route Planning', 'Inventory', 'Vendor Management'] },
  { name: 'Research & Development', category: 'IT', roles: ['Research Engineer', 'R&D Analyst', 'Innovation Manager'], skills: ['Research', 'Prototyping', 'Data Analysis', 'Documentation'] },
  { name: 'Information Security', category: 'IT', roles: ['Information Security Analyst', 'Security Consultant', 'GRC Analyst'], skills: ['Risk Assessment', 'Security Audits', 'ISO 27001', 'Compliance'] },
  { name: 'Technical Support', category: 'IT', roles: ['Technical Support Engineer', 'Support Analyst', 'Support Manager'], skills: ['Troubleshooting', 'Linux', 'Networking', 'Ticketing'] },
  { name: 'IT Infrastructure', category: 'IT', roles: ['Infrastructure Engineer', 'Systems Administrator', 'Infrastructure Manager'], skills: ['Linux', 'Windows Server', 'Virtualization', 'Networking'] },
  { name: 'Network Engineering', category: 'IT', roles: ['Network Engineer', 'Network Administrator', 'Network Architect'], skills: ['Routing', 'Switching', 'Network Security', 'Cisco'] },
  { name: 'Database Administration', category: 'IT', roles: ['Database Administrator', 'Database Engineer', 'SQL Developer'], skills: ['SQL', 'PostgreSQL', 'Oracle', 'Database Tuning'] },
  { name: 'Quality Assurance', category: 'IT', roles: ['Quality Assurance Engineer', 'Quality Analyst', 'QA Lead'], skills: ['Quality Control', 'Test Planning', 'Root Cause Analysis', 'Auditing'] },
  { name: 'Training & Development', category: 'Non-IT', roles: ['Learning Manager', 'Training Specialist', 'Instructional Designer'], skills: ['Training', 'Instructional Design', 'Coaching', 'Communication'] },
  { name: 'Public Relations', category: 'Non-IT', roles: ['PR Manager', 'PR Executive', 'Communications Specialist'], skills: ['Media Relations', 'Public Speaking', 'Press Releases', 'Writing'] },
  { name: 'Corporate Communications', category: 'Non-IT', roles: ['Communications Manager', 'Content Writer', 'Internal Communications Specialist'], skills: ['Writing', 'Internal Communications', 'Editing', 'Presentation'] },
  { name: 'Facilities Management', category: 'Non-IT', roles: ['Facilities Manager', 'Facilities Executive', 'Workplace Coordinator'], skills: ['Facility Management', 'Vendor Relations', 'Safety', 'Budgeting'] },
  { name: 'Manufacturing', category: 'Non-IT', roles: ['Manufacturing Engineer', 'Production Planner', 'Manufacturing Manager'], skills: ['Lean Manufacturing', 'Production Planning', 'Quality Control', 'Safety'] },
  { name: 'Production', category: 'Non-IT', roles: ['Production Manager', 'Production Supervisor', 'Production Executive'], skills: ['Production Planning', 'Operations', 'Quality Control', 'Safety'] },
  { name: 'Engineering', category: 'IT', roles: ['Engineering Manager', 'Technical Engineer', 'Engineering Director'], skills: ['Engineering Design', 'Project Planning', 'CAD', 'Leadership'] },
  { name: 'Mechanical Engineering', category: 'IT', roles: ['Mechanical Engineer', 'Design Engineer', 'Mechanical Lead'], skills: ['CAD', 'Mechanical Design', 'SolidWorks', 'Manufacturing'] },
  { name: 'Electrical Engineering', category: 'IT', roles: ['Electrical Engineer', 'Power Systems Engineer', 'Electrical Lead'], skills: ['Circuit Design', 'Electrical Systems', 'AutoCAD', 'Testing'] },
  { name: 'Electronics Engineering', category: 'IT', roles: ['Electronics Engineer', 'Embedded Engineer', 'Hardware Engineer'], skills: ['Embedded Systems', 'PCB Design', 'C', 'Circuit Design'] },
  { name: 'Product Design', category: 'IT', roles: ['Product Designer', 'Industrial Designer', 'Design Lead'], skills: ['Product Design', 'Figma', 'Prototyping', 'User Research'] },
  { name: 'Business Intelligence', category: 'IT', roles: ['BI Analyst', 'BI Developer', 'Analytics Manager'], skills: ['Power BI', 'SQL', 'Data Visualization', 'Tableau'] },
  { name: 'Risk Management', category: 'Non-IT', roles: ['Risk Manager', 'Risk Analyst', 'Operational Risk Specialist'], skills: ['Risk Assessment', 'Controls', 'Reporting', 'Compliance'] },
  { name: 'Compliance', category: 'Non-IT', roles: ['Compliance Manager', 'Compliance Analyst', 'Policy Specialist'], skills: ['Regulatory Compliance', 'Auditing', 'Policy Design', 'Risk Assessment'] },
];

const generateEmployees = (startId, count) => Array.from({ length: count }, (_, index) => {
  const id = startId + index;
  const firstName = firstNames[index % firstNames.length];
  const lastName = lastNames[Math.floor(index / firstNames.length) % lastNames.length];
  const department = departments[index % departments.length];
  const role = department.roles[index % department.roles.length];
  const joiningYear = 2020 + (index % 6);
  const joiningMonth = String((index % 12) + 1).padStart(2, '0');
  const joiningDay = String((index % 27) + 1).padStart(2, '0');

  return {
    id,
    employeeId: id,
    firstName,
    lastName,
    name: `${firstName} ${lastName}`,
    email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${id}@companyai.local`,
    phone: `900${String(1000000 + id).slice(-7)}`,
    department: department.name,
    category: department.category,
    employeeType: department.category === 'IT' ? 'IT' : 'NON_IT',
    role,
    designation: role,
    location: locations[index % locations.length],
    joiningDate: `${joiningYear}-${joiningMonth}-${joiningDay}`,
    salary: 36000 + ((index * 1375) % 42000),
    status: index % 29 === 0 ? 'ON_LEAVE' : (index % 47 === 0 ? 'INACTIVE' : 'ACTIVE'),
    skills: department.skills.slice(0, 3 + (index % 2)),
  };
});

module.exports = generateEmployees;

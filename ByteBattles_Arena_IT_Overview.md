# ByteBattles Arena - IT Security & Compliance Overview

## Platform Summary
**ByteBattles Arena** is a Python coding education platform with AI-powered grading, gamification, and classroom management tools designed for middle/high school CS education.

---

## Security & Privacy

### Data Collection
- **Student Data Collected:** Name, email (via Google OAuth), code submissions, assignment scores
- **Authentication:** Google OAuth only - no passwords stored by our platform
- **Data Storage:** Encrypted cloud storage (AWS infrastructure via Emergent.sh)
- **Data Usage:** Educational purposes only - grading, progress tracking, classroom management
- **Third-Party Sharing:** NONE - No ads, no data selling, no external sharing

### Encryption & Security
- **Transport:** All traffic encrypted via HTTPS/TLS
- **At Rest:** Database encryption enabled
- **Authentication:** Industry-standard OAuth 2.0 (Google)
- **Session Management:** Secure cookie-based sessions with expiration

---

## Compliance

### FERPA (Family Educational Rights and Privacy Act)
✅ **Compliant** - Platform collects only educational records necessary for instruction
✅ Uses school-issued Google accounts (school already has consent)
✅ Teachers control data access - only teacher and enrolled students see classroom data
✅ No unauthorized third-party access

### COPPA (Children's Online Privacy Protection Act)
✅ **Compliant** - Uses school Google Workspace accounts
✅ School maintains parental consent for Google services
✅ No direct marketing to children
✅ Minimal data collection

### CSTA Standards Alignment
✅ Problems tagged with CSTA K-12 CS Standards
✅ Supports Computer Science curriculum requirements

---

## Technical Requirements

### Domain Whitelisting Needed
```
*.emergentagent.com
devmentor-15.preview.emergentagent.com
```

### Required Access
- Google OAuth popup (oauth2.googleapis.com)
- Standard HTTPS (port 443)
- No special firewall rules needed

### Browser Compatibility
- Chrome/Chromebook (primary)
- Firefox, Safari, Edge (supported)
- Mobile responsive

### System Requirements
- Modern web browser
- Internet connection
- School Google Workspace account

---

## Educational Value

### Teacher Benefits
- **Automated Grading:** AI evaluates code submissions, provides feedback
- **Reduced Workload:** No manual grading of 100+ coding assignments
- **Progress Tracking:** Real-time dashboards, leaderboards, analytics
- **Problem Library:** 200+ pre-built coding problems with answer keys
- **Classroom Management:** Assignment scheduling, multi-class support

### Student Benefits
- **Immediate Feedback:** AI grading provides instant results
- **Gamification:** XP, ranks, leaderboards increase engagement
- **Practice Environment:** Safe sandbox for experimentation
- **Skill Building:** Aligns with AP CS Principles and CSTA standards

### Curriculum Integration
- Supports Python (primary language for AP CS Principles)
- Lesson-based structure (Class Practice, Paired Programming, Independent Work, Debugging)
- Teacher-created content library

---

## Cost & Commitment

### Pricing
- **Current Status:** FREE pilot/beta testing
- **No Contracts:** No long-term commitments required
- **No Student Fees:** Students don't pay anything
- **Future:** May introduce premium features for teachers (not students)

### Trial Period
- **Pilot Scope:** One teacher, one class (approx. 20-30 students)
- **Duration:** 2-4 weeks initial testing
- **Opt-Out:** Can discontinue at any time

---

## Support & Monitoring

### Platform Maintenance
- **Uptime:** Cloud-hosted with 99%+ availability
- **Updates:** Regular feature improvements, no downtime required
- **Support:** Direct developer support during pilot

### Teacher Control
- Teachers create classrooms, invite students via class codes
- Teachers assign/remove students
- Teachers control what content students access
- No student-to-student direct messaging (safety feature)

---

## Risk Assessment

### Low Risk Factors
✅ Read-only access to Google profile (name, email only)
✅ No file downloads to student devices (browser-based only)
✅ No payment processing or financial data
✅ No social features beyond classroom (no chat, no public profiles)
✅ Teacher-controlled environment (students can't access other classrooms)
✅ Limited pilot scope (one class)

### Mitigation
- Only school-issued Google accounts accepted
- Teacher monitors all student activity via dashboard
- Platform logs all submissions for audit trail
- Can disable individual student accounts if needed

---

## Approval Request

**Requested Action:**
Whitelist domains for a **4-week pilot** with one class (2nd period, ~20 students)

**Timeline:**
- Week 1: Setup and onboarding
- Weeks 2-3: Active use and feedback
- Week 4: Evaluation and decision to continue or discontinue

**Success Criteria:**
- Students complete assignments successfully
- Teacher workload reduced
- No security/privacy incidents
- Positive student engagement

**Point of Contact:**
[Your Name]
[Your School Email]
[Your Phone]

**Platform Support:**
Emergent.sh (platform provider)
Technical documentation: https://emergentagent.com

---

## Questions?

**Common IT Questions Answered:**

**Q: Can students bypass restrictions?**
A: No. Only enrolled students in a teacher's classroom can access assignments. No public access.

**Q: What if a student leaves our school?**
A: Their account becomes inaccessible once their school Google account is disabled.

**Q: Can we audit what students are doing?**
A: Yes. Teachers see all submissions, code, scores, and timestamps.

**Q: What happens to data if we stop using it?**
A: Teacher can export data. Student data remains private and is not shared.

**Q: Is this just ChatGPT/AI cheating?**
A: No. Students write code in a controlled editor. AI is used for grading (like auto-grading in Canvas), not for generating answers.

**Q: Do we need parent consent forms?**
A: Typically no - uses existing school Google accounts which already have consent. Check with your legal/compliance team if uncertain.

---

**Prepared for:** [IT Director Name]
**Date:** [Today's Date]
**Requested by:** [Your Name], Computer Science Teacher

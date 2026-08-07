---
title: Rekindle & Rise App PRD
status: draft
created: 2026-07-22
updated: 2026-07-26
---

# Rekindle & Rise App PRD

## 1. Product Overview
Rekindle & Rise is a privacy-first digital community platform for burn survivors and their supporters. The MVP will provide a safe, supportive online space where users can discover events and initiatives, join moderated communities, and use a private healing journal without substituting for professional medical or mental-health care.

### Launch Assumption
The first release will follow a hybrid web-plus-mobile approach, with a responsive web experience and a mobile-optimized experience available at launch. Native mobile apps are out of scope for the initial launch.

## 2. Problem Statement
Burn survivors often face a profound sense of isolation after leaving the hospital and returning to everyday life. Many long for a place where they can be seen, understood, and connected to others who share a similar journey. While medical care and clinical support remain essential, there is also a deep need for spaces that nurture belonging, empathy, and community. Rekindle & Rise exists to fill that gap by helping burn survivors form meaningful connections, find supportive communities, and come together through online forums and local events. By creating a space rooted in dignity, compassion, and human connection, Rekindle & Rise aims to help survivors feel less alone and more supported as they rebuild their lives.

## 3. Product Goals
### Primary Goals
- Create a trusted, welcoming environment for burn survivors and their supporters.
- Make it easy for users to discover relevant events, initiatives, and peer communities.
- Provide a private, customizable healing journal that supports reflection and recovery.
- Establish a safe moderation and governance foundation for future community growth.

### Non-Goals for MVP
- Replacing therapy, medical treatment, or crisis services.
- Providing clinical diagnoses or treatment recommendations.
- Supporting under-13 accounts without parent-managed onboarding and consent controls.
- Building a full social network with advanced messaging, video, or marketplace features in v1.

## 4. Users and Stakeholders
### Primary Users
- Burn survivors seeking connection, community, and recovery support.
- Caregivers and family members looking for educational resources and supportive communities.
- Volunteers and supporters who want to help the organization and participate in events.
- Approved organizations that publish events, volunteer opportunities, and updates.

### Stakeholders
- Rekindle & Rise leadership and founders.
- Community moderators and administrators.
- Privacy and security reviewers.
- Product, design, engineering, and future operations teams.

### Role Model and Governance Decisions
Based on safety, privacy, and operational best practices, v1 should use a narrow role model focused on trust and moderation. The initial roles will include:
- Survivor or participant
- Supporter or caregiver
- Organization representative
- Moderator
- Platform administrator

In later phases, the platform may add roles such as peer mentor, group facilitator, and verified professional partner. Organization verification will follow a structured approval process that requires identity confirmation, mission alignment, representative validation, and periodic review. Moderator approval will follow a role-based workflow with training, documented community standards, escalation to administrators, and audit logging for sensitive actions.

## 5. MVP Scope
### In Scope for Launch
- User onboarding with role-based guidance and consent handling.
- Account creation with optional healing profile setup.
- Privacy controls for account, profile, and journal data.
- Personalized home experience with events, posts, and initiative updates.
- Moderated community groups organized by location and topic.
- Private healing journal with prompts, activities, and downloadable/exportable entries.
- Basic event discovery and organization publishing workflows.
- Core moderation and reporting workflows.

### Out of Scope for Launch
- Real-time direct messaging at scale.
- Advanced recommendation engines.
- Full mobile-native applications.
- Advanced analytics dashboards for internal operations.
- Complex health-data integrations with hospitals or providers.

## 6. User Journeys
### Journey 1: New Survivor Onboarding
A new survivor visits the platform, learns about Rekindle & Rise, creates an account, sets privacy preferences, optionally completes a healing profile, and lands on a personalized home experience.

### Journey 2: Community Participation
A user joins a moderated group, browses community posts, views events, and participates in supportive conversations.

### Journey 3: Private Reflection
A user opens the healing journal, writes an entry, uses a guided prompt or activity, and later exports or deletes entries as desired.

### Journey 4: Organization and Event Management
An approved organization publishes an event or initiative update and users discover and engage with it through the platform.

## 7. Functional Requirements
### FR-1 Authentication and Onboarding
- The system shall present a clear welcome experience explaining the mission, peer-support purpose, and privacy expectations.
- The system shall allow users to select a user role during onboarding.
- The system shall collect age and consent information and support a safe path for minors while keeping under-13 accounts out of scope for v1 unless they are created through a verified parent-managed account flow.
- The system shall require account information including display name, email, password, age confirmation, and general location.
- The system shall support parent or guardian-managed account creation for users under 13, with linked consent and supervision controls.

### FR-2 Privacy and Data Controls
- The system shall default sensitive profile and journal data to private.
- The system shall allow users to configure visibility for each sensitive field.
- The system shall provide clear options to view, correct, export, and delete personal data.
- The system shall support account deletion and selective deletion of journal content.

### FR-3 Profile and Preferences
- The system shall support a community profile with display name, photo, biography, interests, joined communities, and optional survivor story.
- The system shall support optional burn-related profile data that remains private by default.
- The system shall allow users to manage notification preferences and basic security settings.

### FR-4 Home Experience
- The system shall display a personalized home page with upcoming events, community posts, initiative updates, and quick actions.
- The system shall surface events from verified organizations and local or virtual sources based on user context.

### FR-5 Community Experience
- The system shall support moderated groups based on location and topic.
- The system shall allow users to browse groups, join communities, and manage notification preferences.
- The system shall support discussion posts, comments, reactions, polls, and announcements.
- The system shall provide reporting, muting, and blocking tools.

### FR-6 Journal Experience
- The system shall provide a private healing journal.
- The system shall support free-writing entries, guided prompts, mood check-ins, gratitude entries, milestone tracking, and goals.
- The system shall support optional photo attachments and voice-to-text entries where feasible.
- The system shall allow users to export or delete entries and remove the full journal.

### FR-7 Events and Organization Content
- The system shall support event discovery, event details, RSVP, reminders, and optional feedback.
- The system shall include event details such as date, time, location, format, host, accessibility information, cost, and registration requirements.
- The system shall allow approved organizations to publish initiatives and updates.

### FR-8 Moderation and Safety
- The system shall support moderator and administrator workflows for approving content, managing groups, and handling reports.
- The system shall allow content to be hidden or flagged when it contains graphic or unsafe material.
- The system shall provide clear community guidelines and reporting mechanisms.

### FR-9 Governance and Organization Verification
- The system shall support organization verification through identity confirmation, stated mission alignment, contact validation, and administrative review.
- The system shall support moderator onboarding with documented standards, approval workflows, and escalation paths for disputes or sensitive content issues.
- The system shall log moderation decisions and approvals for auditability and accountability.

## 8. Non-Functional Requirements
### Privacy and Security
- The platform must protect sensitive health-related data with strong authentication, encryption, access control, and audit logging.
- The system must support backup, incident review, and controlled access to sensitive information.

### Trust and Safety
- The platform must be designed to discourage harassment, harmful content, and privacy violations.
- Moderation workflows must be sufficient for early-stage community growth and abuse response.

### Accessibility and Inclusion
- The platform must support accessible navigation, readable content, and flexible privacy controls.
- The experience must be usable on common mobile and desktop browsers.

### Reliability
- The platform must support stable uptime for core user flows during launch and early growth.
- Failures in moderation or content visibility must not expose private content unexpectedly.

## 9. Success Metrics
- Percentage of new users who complete onboarding.
- Percentage of users who create at least one journal entry within the first 14 days.
- Percentage of users who join at least one group or engage with one community feature.
- Number of active events, groups, and verified organization posts published.
- User retention and repeat visits over the first 30 and 90 days.

## 10. Launch Readiness Criteria
The MVP is ready for launch when:
- privacy and data handling requirements have been reviewed by a qualified advisor.
- moderation workflows and community guidelines are tested and staffed.
- onboarding, journal, groups, and events are validated through user testing.
- key security and backup controls are in place.
- launch support and escalation paths are defined for abuse reports and user support.

## 11. Risks and Mitigations
- Privacy and compliance risk: mitigate through clear consent flows, minimal data collection, and review by legal/privacy advisors.
- Safety and moderation risk: mitigate through content guidelines, reporting tools, and moderator workflows.
- Low adoption risk: mitigate by focusing on a simple, supportive onboarding experience and clear value for first-time users.
- Scope creep risk: mitigate by keeping v1 focused on onboarding, community, journal, and event discovery.

## 12. Resolved Decisions
- Launch platform: the product will use a hybrid web-plus-mobile approach, with a responsive web experience and a mobile-optimized experience at launch.
- v1 user roles: the initial role model will include survivor or participant, supporter or caregiver, organization representative, moderator, and platform administrator; later phases may add peer mentor, group facilitator, and verified professional partner roles.
- Governance process: organization verification will require identity confirmation, mission alignment, representative validation, and periodic review; moderator approval will use a role-based workflow with training, documented standards, escalation to administrators, and audit logging.
- Under-13 and health-data handling: all under-13 accounts must be created under a verified parent or guardian account, and health-related data handling will follow a minimal-data, consent-based approach with privacy review.

## 13. Recommended Next Steps
- Validate the MVP scope with Rekindle & Rise leadership.
- Confirm the launch platform decision and privacy review path.
- Prepare UX flows for onboarding, community, and journal experiences.
- Convert this PRD into epics and user stories for implementation planning.

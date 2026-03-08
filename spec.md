# Specification

## Summary
**Goal:** Replace the principal-ID-based add-member input in group chat settings with a searchable list of the current user's direct message conversation contacts.

**Planned changes:**
- Remove the raw principal-ID text input for adding members in the group settings panel (GroupChatPage).
- Add a searchable list/dropdown populated from the user's existing direct message conversation contacts.
- Display each contact by their display name and username.
- Allow the group admin/creator to select one or more contacts and add them as group members.
- Hide or disable contacts who are already members of the group.
- Leave all other group settings functionality (rename, change avatar, remove members, leave group, etc.) unchanged.

**User-visible outcome:** The group admin can now add new members by browsing and searching their existing conversation contacts by name, instead of manually entering a principal ID.

export const EN_ENTITY_TYPE_TERMS = {
    device: ['keyboard', 'mouse', 'monitor', 'device', 'earbuds', 'bluetooth earbuds', 'headset', 'earphone', 'earphones'],
    project: ['project', 'repo', 'repository', 'sdk', 'library', 'platform', 'api'],
    person: ['they', 'user'],
    brand: ['apple', 'sony', 'logitech', 'razer', 'dell', 'brand', 'framework', 'library'],
    issue: ['issue', 'bug']
};
export const EN_RELATION_PHRASES = {
    owns: ['i own', 'i have', 'i got', 'my'],
    purchased: ['i bought', 'i bought another', 'i bought a new', 'i got a new'],
    has_issue: ['issue', 'disconnect', 'noise', 'lag', 'slow', 'connection lost', 'flicker'],
    worked_on: ['worked on', 'working on', 'building', 'we are building', "we're building", 'developing', 'maintaining', 'shipping'],
    likes: ['i like'],
    dislikes: ['i dislike']
};
export const EN_REFERENCE_SIGNALS = {
    newInstance: ['i bought another', 'i got a new'],
    updateInstance: ['that one', 'the old one', 'the new one', 'the previous one', 'previous one', 'new one', 'this project', 'the new project', 'the previous project'],
    ambiguous: ['it', 'this one', 'that thing', 'this project', 'that project'],
    latest: ['the new one', 'new one', 'this one', 'the current one', 'this project', 'the new project', 'new project', 'that project'],
    previous: ['the previous one', 'previous one', 'the old one', 'old one', 'the previous project', 'previous project', 'old project']
};
export const EN_SHORT_REPLY_BINDING = {
    approved: ['yes', 'ok', 'okay', 'sounds good', 'continue', 'go on'],
    rejected: ['no', "don't", "don't do that", 'never mind', 'forget it'],
    entitySelection: ['that one', 'this one', 'the new one', 'new one', 'the previous one', 'previous one', 'the old one', 'old one']
};
export const EN_PENDING_PATTERNS = {
    action: [/\bshould\b/i, /\bdo you want\b/i, /\bwant me to\b/i],
    entity: [/\bwhich\b/i, /\bor\b/i]
};
export const EN_LONG_TERM_SIGNAL_TERMS = ['workflow', 'api', 'database', 'project', 'issue', 'prefer', 'like', 'dislike', 'decide', 'using', 'fixed', 'gave away'];
export const EN_ISSUE_KEYWORDS = {
    connectivity: ['disconnect', 'connection lost'],
    sound: ['noise'],
    performance: ['lag', 'slow', 'flicker']
};
export const EN_ISSUE_QUALIFIERS = {
    left: ['left ear'],
    right: ['right ear']
};

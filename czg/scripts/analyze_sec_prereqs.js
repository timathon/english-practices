const fs = require('fs');
const b = JSON.parse(fs.readFileSync('czg/data/m7a-bundle.json', 'utf8'));
const topicsById = {};
b.topics.forEach(t => topicsById[t.id] = t);

b.chapters.forEach(ch => {
  ch.sections.forEach(sec => {
    const secTopicSet = new Set(sec.topic_ids);
    const prereqEdges = b.dependencies.filter(d => secTopicSet.has(d.topicId));
    const uniquePrereqIds = Array.from(new Set(prereqEdges.map(d => d.prerequisiteId)));
    
    // Check which prerequisites are inside the same section, or future/later chapter
    const internalPrereqs = uniquePrereqIds.filter(pid => secTopicSet.has(pid));
    const externalPrereqs = uniquePrereqIds.filter(pid => !secTopicSet.has(pid)).map(pid => topicsById[pid]).filter(Boolean);
    
    console.log(`\n=== [${sec.section_number}] ${sec.title} (topics: ${sec.topic_ids.length}) ===`);
    if (internalPrereqs.length > 0) {
      console.log('  [Internal dependencies within same section]:', internalPrereqs.map(id => `${id} ${topicsById[id]?.name}`));
    }
    console.log('  [Prerequisites for this section]:');
    externalPrereqs.forEach(t => {
      console.log(`    - [${t.grade <= 6 ? '小学' : '初中 ' + t.grade}] ${t.id} ${t.name} (${t.chapter || '小学基础'})`);
    });
  });
});

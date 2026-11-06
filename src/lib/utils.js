export function uuid() {
  return crypto.randomUUID();
}

export function formatDate(timestamp) {
  const d = new Date(timestamp);
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
}

export function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

export function findNode(nodes, id) {
  for (const node of nodes) {
    if (node.id === id) return node;
    if (node.children && node.children.length) {
      const found = findNode(node.children, id);
      if (found) return found;
    }
  }
  return null;
}

export function findParent(nodes, id, parent = null) {
  for (const node of nodes) {
    if (node.id === id) return { parent, siblings: nodes };
    if (node.children && node.children.length) {
      const found = findParent(node.children, id, node);
      if (found) return found;
    }
  }
  return null;
}

export function removeNode(nodes, id) {
  for (let i = 0; i < nodes.length; i++) {
    if (nodes[i].id === id) {
      return nodes.splice(i, 1)[0];
    }
    if (nodes[i].children && nodes[i].children.length) {
      const removed = removeNode(nodes[i].children, id);
      if (removed) return removed;
    }
  }
  return null;
}

export function getNodeLevel(nodes, id, level = 0) {
  for (const node of nodes) {
    if (node.id === id) return level;
    if (node.children && node.children.length) {
      const found = getNodeLevel(node.children, id, level + 1);
      if (found !== null) return found;
    }
  }
  return null;
}
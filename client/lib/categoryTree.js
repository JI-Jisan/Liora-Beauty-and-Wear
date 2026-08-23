export function buildTree(flat = []) {
  const map = new Map();
  const roots = [];

  flat.forEach((c) => map.set(String(c._id), { ...c, children: [] }));

  flat.forEach((c) => {
    const node = map.get(String(c._id));
    const pid = c.parent ? String(c.parent) : null;
    if (pid && map.has(pid)) {
      map.get(pid).children.push(node);
    } else {
      roots.push(node);
    }
  });

  const sortRec = (arr) => {
    arr.sort((a, b) => (a.order || 0) - (b.order || 0) || a.name.localeCompare(b.name));
    arr.forEach((n) => sortRec(n.children));
  };

  sortRec(roots);
  return roots;
}

// dropdown এ "Makeup › Face Makeup › Foundation" দেখানোর জন্য
export function flattenWithPath(nodes, prefix = "", out = []) {
  nodes.forEach((n) => {
    const path = prefix ? `${prefix} › ${n.name}` : n.name;
    out.push({ _id: String(n._id), name: n.name, path, level: n.level ?? 0 });
    flattenWithPath(n.children || [], path, out);
  });
  return out;
}

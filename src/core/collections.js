export function intersectSets(left, right) {
  const out = new Set();
  const [small, large] = left.size <= right.size ? [left, right] : [right, left];

  small.forEach((value) => {
    if (large.has(value)) {
      out.add(value);
    }
  });

  return out;
}

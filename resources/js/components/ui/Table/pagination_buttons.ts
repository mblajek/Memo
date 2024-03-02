export function getPaginationButtonsList({
  numPages,
  pageIndex,
  numSiblings,
}: {
  numPages: number;
  pageIndex: number;
  numSiblings: number;
}): (number | "...")[] {
  const numButtons = 2 * numSiblings + 5;
  if (numPages <= numButtons) {
    return Array.from({length: numPages}, (_, i) => i);
  }
  const buttons: (number | "...")[] = [0];
  let includeNextToLast = false;
  let centerIndex = pageIndex;
  if (centerIndex <= 2 + numSiblings) {
    buttons.push(1);
    centerIndex = 2 + numSiblings;
  } else {
    buttons.push("...");
    if (centerIndex >= numPages - 3 - numSiblings) {
      includeNextToLast = true;
      centerIndex = numPages - 3 - numSiblings;
    }
  }
  for (let i = centerIndex - numSiblings; i <= centerIndex + numSiblings; i++) {
    buttons.push(i);
  }
  buttons.push(includeNextToLast ? numPages - 2 : "...", numPages - 1);
  return buttons;
}

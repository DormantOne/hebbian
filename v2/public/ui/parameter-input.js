export function getNumberParamById(id, errorMessages) {
  const inputElement = document.getElementById(id);
  if (!inputElement) {
    errorMessages.push(`No input element with ID "${id}" found.`);
    return null;
  }
  const valueToValidate = inputElement.value;
  const numberValue = Number(valueToValidate);
  if (isNaN(numberValue)) {
    errorMessages.push(
      `Input element with ID "${id}" does not contain a valid number.`
    );
    return null;
  }
  return numberValue;
}

export function getStringRadioByName(name, errorMessages) {
  const valueToValidate = document.querySelector(
    `input[name="${name}"]:checked`
  ).value;

  if (typeof valueToValidate !== "string" || valueToValidate.trim() === "") {
    errorMessages.push(
      `Input element with name "${name}" does not contain a (non empty) string value.`
    );
    return null;
  }
  return valueToValidate;
}

/**
 * Gets the text content of the nearest <label> (sibling, cousin, etc)
 * to the desired element
 *
 * If the label contains elements:
 *
 * 1. Handle cases where there's both text and a single child element
 * 2. For labels with multiple children, remove all child elements and
 *    aggregate all text content
 *
 * @param {string} selector
 * @returns {string}
 */
export function getNearestLabelContents(selector) {
  const element = document.querySelector(selector);
  if (!element) {
    throw new Error(`No element found with selector "${selector}".`);
  }

  // Find the nearest label
  const label =
    element.closest("label") ||
    element.parentElement?.querySelector("label") ||
    document.querySelector(`label[for="${element.id}"]`);

  if (!label) {
    throw new Error(`No label found for element with selector "${selector}".`);
  }

  function getTextContent(el) {
    // Handle case where there's both text and a single child element
    if (
      el.childNodes.length === 2 &&
      (el.firstChild.nodeType === Node.TEXT_NODE ||
        el.lastChild.nodeType === Node.TEXT_NODE)
    ) {
      return el.textContent.trim();
    }
    if (el.childNodes.length === 0) {
      return el.textContent.trim();
    }

    if (el.childNodes.length > 1) {
      // Remove all child elements and aggregate all text content
      let text = "";
      el.childNodes.forEach((node) => {
        if (node.nodeType === Node.TEXT_NODE) {
          text += node.textContent;
        }
      });
      // Use regex to condense consecutive spaces
      return text.replace(/\s+/g, " ").trim();
    }

    const child = el.firstChild;
    if (child.nodeType === Node.TEXT_NODE) {
      return child.textContent.trim();
    }

    if (child.nodeType === Node.ELEMENT_NODE) {
      return child.textContent.trim();
    }

    throw new Error(`Unexpected node type in label.`);
  }

  return getTextContent(label);
}

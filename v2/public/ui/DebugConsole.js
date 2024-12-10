const MAX_LOGS = 20;

/**
 * A singleton-style class to manage the specialty debug console
 * on the simulation control panel
 */
export default class DebugConsole {
  /**
   * Gets the <div> element representing the debug console
   */
  static getDebugConsoleElement() {
    // Assume this is valid and not null
    return document.querySelector(".DebugConsole");
  }

  /**
   * Gets children of debug console with class DebugConsoleMessage
   */
  static getDebugConsoleMessageElements() {
    return DebugConsole.getDebugConsoleElement().querySelectorAll(
      ".DebugConsoleMessage"
    );
  }

  /**
   * Scrolls the debug console to the bottom
   */
  static scrollToBottomInstant() {
    const debugConsole = DebugConsole.getDebugConsoleElement();
    debugConsole.scrollTo({
      top: debugConsole.scrollHeight,
      behavior: "instant",
    });
  }

  /**
   * Deletes messages at the top of the debug console
   * until there are no more than MAX_LOGS messages
   */
  static clearOld() {
    let messages = DebugConsole.getDebugConsoleMessageElements();
    while (messages.length > MAX_LOGS) {
      messages[0].remove();
      messages = DebugConsole.getDebugConsoleMessageElements();
    }
  }

  /**
   * Variant is danger, light, dark, info, warning etc
   *
   * It generates a div with whitespace pre-wrap, font family monospace
   * and adds the class DebugConsoleMessage as well as `theme-text-${variant}` class
   */
  static write(variant, message, details) {
    const debugConsole = DebugConsole.getDebugConsoleElement();
    const messageElement = document.createElement("div");
    messageElement.classList.add(
      "DebugConsoleMessage",
      `theme-text-${variant}`
    )

    if (!details) {
      const messageTextElement = document.createElement("div");
      messageTextElement.textContent = message;
      messageTextElement.style.whiteSpace = "pre-wrap";
      messageTextElement.style.fontFamily = "monospace";
      messageElement.appendChild(messageTextElement);
      messageTextElement.classList.add("DebugConsoleMessageText");
    } else {
      const messageTextElement = document.createElement("div");
      messageTextElement.textContent = message;
      messageTextElement.style.whiteSpace = "pre-wrap";
      messageTextElement.style.fontFamily = "monospace";
      messageTextElement.classList.add("DebugConsoleMessageText");
      messageElement.appendChild(messageTextElement);
      if (details.name) {
        const headerElement = document.createElement("h3");
        headerElement.textContent = details.name;
        headerElement.classList.add("DebugConsoleMessageName");
        messageElement.prepend(headerElement);
      }
      for (const [key, value] of Object.entries(details)) {
        if (key === "name") {
          continue;
        }
        const detailsElement = document.createElement("details");
        detailsElement.classList.add("DebugConsoleMessageDetails");
        const summaryElement = document.createElement("summary");
        summaryElement.classList.add("DebugConsoleMessageDetailsKey");
        summaryElement.textContent = `${key}`;
        detailsElement.appendChild(summaryElement);
        const detailsContentElement = document.createElement("div");
        detailsContentElement.classList.add("DebugConsoleMessageDetailsValue");
        detailsContentElement.textContent = value;
        detailsContentElement.style.whiteSpace = "pre-wrap";
        detailsContentElement.style.fontFamily = "monospace";
        detailsElement.appendChild(detailsContentElement);
        messageElement.appendChild(detailsElement);
      }
    }
    debugConsole.appendChild(messageElement);
    DebugConsole.clearOld();
    DebugConsole.scrollToBottomInstant();
  }

  static log(message, details) {
    DebugConsole.write("log", message, details);
  }
  static error(message, details) {
    DebugConsole.write("error", message, details);
  }
  static warn(message, details) {
    DebugConsole.write("warning", message, details);
  }

  static info(message, details) {
    DebugConsole.write("info", message, details);
  }

  static reportErrorObject(error) {
    if (typeof error === "object" && error !== null) {
      if (error instanceof Error) {
        DebugConsole.error(error.message, {
          name: error.name,
          stack: error.stack,
        });
      } else {
        try {
          DebugConsole.error(JSON.stringify(error, null, 2));
        } catch (stringifyError) {
          DebugConsole.error(stringifyError.message, {
            name: "Unstringifiable Error Object",
            stack: stringifyError.stack || undefined,
            plainStringValue: error.toString(),
          });
        }
      }
    } else {
      DebugConsole.error(error.toString());
    }
  }
}

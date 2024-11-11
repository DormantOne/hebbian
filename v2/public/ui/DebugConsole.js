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
   * Scrolls the debug console to the bottom with a smooth effect
   */
  static scrollToBottom() {
    const debugConsole = DebugConsole.getDebugConsoleElement();
    debugConsole.scrollTo({
      top: debugConsole.scrollHeight,
      behavior: "smooth",
    });
  }

  /**
   * Deletes messages at the top of the debug console
   * until there are no more than MAX_LOGS messages
   */
  static clearOld() {
    const messages = DebugConsole.getDebugConsoleMessageElements();
    while (messages.length > MAX_LOGS) {
      messages[0].remove();
    }
  }

  /**
   * Variant is danger, light, dark, info, warning etc
   *
   * It generates a div with whitespace pre-wrap, font family monospace
   * and adds the class DebugConsoleMessage as well as `theme-${variant}` class
   */
  static write(variant, message) {
    DebugConsole.clearOld();
    const debugConsole = DebugConsole.getDebugConsoleElement();
    const messageElement = document.createElement("div");
    messageElement.classList.add("DebugConsoleMessage", `theme-${variant}`);
    messageElement.style.whiteSpace = "pre-wrap";
    messageElement.style.fontFamily = "monospace";
    messageElement.textContent = message;
    debugConsole.appendChild(messageElement);
    DebugConsole.scrollToBottom();
    if (variant === "log") {
      console.log(message);
    } else if (variant === "danger") {
      console.error(message);
    } else if (variant === "warning") {
      console.warn(message);
    } else if (variant === "info") {
      console.info(message);
    } else {
      console.log(message);
    }
  }
}

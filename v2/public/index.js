import TabView from "./ui/TabView.js";
import DebugConsole from "./ui/DebugConsole.js";
import Simulation from "./Simulation.js";

window.onload = () => {
  new TabView("parameterTabContainer", 0)
    .constrainToFractionOfWindowHeight(() => {
      let total = 0;
      for (let n = 1; n <= 4; n++) {
        const elem = document.querySelector(`.height-item-${n}`);

        total += elem.clientHeight;
      }
      return total;
    })
    .start();
  document.querySelectorAll(".katex").forEach((element) => {
    let displayMode = undefined;
    const hasKatexBlock = element.classList.contains("katex-block");
    const hasKatexInline = element.classList.contains("katex-inline");
    const defaultOrExplicitDisplay = window.getComputedStyle(element).display;
    const defaultOrExplicitDisplayIsFormOfInline =
      defaultOrExplicitDisplay === "inline" ||
      defaultOrExplicitDisplay === "inline-block";
    if (hasKatexBlock && hasKatexInline) {
      throw new Error(
        "Using katex-block and katex-inline on the same element does not make sense."
      );
    }
    if (!hasKatexBlock && !hasKatexInline) {
      displayMode = !defaultOrExplicitDisplayIsFormOfInline;
    } else {
      displayMode = hasKatexBlock;
    }
    const content = element.textContent || element.innerText;
    // Just for proper type safety
    // Since I dont feel like ensuring exhaustive handling of all cases
    if (typeof displayMode === "undefined") {
      throw new Error(
        "Could not determine or infer math display mode. This should never occur."
      );
    }
    katex.render(content, element, {
      throwOnError: false,
      displayMode: displayMode,
    });
    document.querySelectorAll(".language-javascript").forEach((element) => {
      if (!element.getAttribute("data-highlighted")) {
        hljs.highlightElement(element);
      }
    });
  });

  document.getElementById("startSimulation").addEventListener("click", () => {
    if(window.activeSimulation){
      DebugConsole.write("error","A previous simulation was not stopped properly. Try refreshing the page.")
      return
    }
    DebugConsole.write("info", "Starting simulation...");
    try {
      window.activeSimulation = new Simulation().start();
    } catch (error) {
      if(error instanceof SimulationError){
        
      }
      window.activeSimulation = undefined
    }
  });
  document.getElementById("stopSimulation").addEventListener("click", () => {
    DebugConsole.write("info", "Stopping simulation...");
  });
  document.getElementById("pauseResumeSimulation").addEventListener("click", () => {
  });
};

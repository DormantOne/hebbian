import TabView from "./ui/TabView.js";
import DebugConsole from "./ui/DebugConsole.js";
import Simulation from "./Simulation.js";
import { constrainElementFractionOfWindowSize } from "./ui/layout.js";
import { capitalizeFirstLetter } from "./text.js";

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

  constrainElementFractionOfWindowSize(document.querySelector(".DebugConsole"));

  function getPrettyMetric(value) {
    if (value === null) {
      return "N/A";
    }
    if(typeof value === "string") {
      return capitalizeFirstLetter(value);
    }
    if (typeof value === "number") {
      return value.toString()
    }
    if (Array.isArray(value)) {
      return value.map(getPrettyMetric).join("\n");
    }
    return value.toString();
  }

  window.prettyUpdateMetric = function (id, value){
    const element = document.getElementById(id);
    if(typeof value === "object" && value!==null){
      if(value.widget==="fraction-bar"){ 
        const barContainerDiv = document.createElement("div");
        barContainerDiv.style.width = "100%";
        barContainerDiv.style.height = "1em";
        barContainerDiv.style.border = "2px solid black";
        barContainerDiv.style.position = "relative";
        const barDiv = document.createElement("div");
        barDiv.style.width = `${value.value * 100}%`;
        barDiv.style.position = "absolute";
        barDiv.style.height = "100%";
        barDiv.style.background = value.getColor? value.getColor(value.value) : "grey";
        barContainerDiv.appendChild(barDiv);
        element.innerHTML = "";
        element.appendChild(barContainerDiv);
      }
    }else{
      element.textContent = getPrettyMetric(value)
    }
  }

  function updateUIForSimulationState(state) {
    function setThemeColor(element, themeColor) {
      // Get the class list of the element
      const classList = element.classList;

      // Remove any existing classes with the 'theme-' prefix
      classList.forEach((className) => {
        if (className.startsWith("theme-")) {
          classList.remove(className);
        }
      });

      // Add the new class with the 'theme-' prefix according to themeColor
      classList.add(`theme-${themeColor}`);
    }

    function clearThemeColor(element) {
      const classList = element.classList;
      classList.forEach((className) => {
        if (className.startsWith("theme-")) {
          classList.remove(className);
        }
      });
    }

    // Enable/disable human vs AI radio buttons based on the simulation state
    const radioButtons = document.querySelectorAll(
      'input[name="controlledBy"]'
    );
    const enableRadioButtons = state === "stopped"; // Enable only if the simulation is stopped
    radioButtons.forEach((button) => {
      button.disabled = !enableRadioButtons;
    });

    // Update UI elements based on the simulation state
    window.prettyUpdateMetric("simulationState", state);

    switch (state) {
      case "running":
        startStopSimulation.textContent = "Stop";
        startStopSimulation.disabled = false;
        setThemeColor(startStopSimulation, "danger");
        pauseResumeSimulation.textContent = "Pause";
        pauseResumeSimulation.disabled = false;
        setThemeColor(pauseResumeSimulation, "warning");
        break;
      case "paused":
        startStopSimulation.textContent = "";
        startStopSimulation.disabled = true;
        clearThemeColor(startStopSimulation);
        pauseResumeSimulation.textContent = "Resume";
        pauseResumeSimulation.disabled = false;
        setThemeColor(pauseResumeSimulation, "action");
        break;
      case "stopped":
        startStopSimulation.textContent = "Start";
        startStopSimulation.disabled = false;
        setThemeColor(startStopSimulation, "success");
        pauseResumeSimulation.textContent = "";
        pauseResumeSimulation.disabled = true;
        clearThemeColor(pauseResumeSimulation);
        break;
      case "starting":
        startStopSimulation.textContent = "Starting...";
        startStopSimulation.disabled = true;
        setThemeColor(startStopSimulation, "info");
        pauseResumeSimulation.textContent = "";
        pauseResumeSimulation.disabled = true;
        clearThemeColor(pauseResumeSimulation);
        break;
      case "stopping":
        startStopSimulation.textContent = "Stopping...";
        startStopSimulation.disabled = true;
        setThemeColor(startStopSimulation, "info");
        pauseResumeSimulation.textContent = "";
        pauseResumeSimulation.disabled = true;
        clearThemeColor(pauseResumeSimulation);
        break;
      case "pausing":
        startStopSimulation.textContent = "";
        startStopSimulation.disabled = true;
        clearThemeColor(startStopSimulation);
        pauseResumeSimulation.textContent = "Pausing...";
        pauseResumeSimulation.disabled = true;
        setThemeColor(pauseResumeSimulation, "info");
        break;
      case "resuming":
        startStopSimulation.textContent = "";
        startStopSimulation.disabled = true;
        clearThemeColor(startStopSimulation);
        pauseResumeSimulation.textContent = "Resuming...";
        pauseResumeSimulation.disabled = true;
        setThemeColor(pauseResumeSimulation, "info");
        break;
      default:
        throw new Error(`Unknown simulation state: ${state}`);
    }
  }

  const simulation = new Simulation(updateUIForSimulationState);

  document
    .getElementById("startStopSimulation")
    .addEventListener("click", () => {
      try {
        simulation.handleStartStopButton();
      } catch (error) {
        DebugConsole.reportErrorObject(error);
      }
    });

  document
    .getElementById("pauseResumeSimulation")
    .addEventListener("click", () => {
      try {
        simulation.handlePauseResumeButton();
      } catch (error) {
        DebugConsole.reportErrorObject(error);
      }
    });
};

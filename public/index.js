let UTILS = (function () {
  let ret = {
    isNumber: function (n) {
      return !isNaN(parseFloat(n)) && isFinite(n);
    },
  };

  return ret;
})();

let SLIDES_MODULE = (function () {
  let ret = {},
    sections = document.querySelectorAll("section"),
    KEYS = {
      RIGHT: 39,
      LEFT: 37,
    };

  ret.init = function () {
    moduleListeners();
  };

  ret.getSlideIndex = function () {
    for (let i = 0; i < sections.length; i++) {
      if (sections[i].classList.contains("active")) {
        return i;
        break;
      }
    }
  };

  ret.nextSlide = function () {
    let next_index = ret.getSlideIndex() + 1,
      active_slide = document.querySelector(".active"),
      len = sections.length;

    if (UTILS.isNumber(next_index) && next_index <= len) {
      active_slide.classList.add("leave");
      active_slide.classList.remove("active");

      if (next_index < len) {
        sections[next_index].classList.add("active");
      }
    }
  };

  ret.previousSlide = function () {
    let previous_index = ret.getSlideIndex() - 1,
      active_slide = document.querySelector(".active");

    if (!active_slide) {
      previous_index = sections.length - 1;
    }

    if (UTILS.isNumber(previous_index) && previous_index > -1) {
      sections[previous_index].classList.add("active");
      sections[previous_index].classList.remove("leave");

      if (active_slide) {
        active_slide.classList.remove("active");
      }
    }
  };

  function moduleListeners() {
    Array.prototype.forEach.call(sections, sectionsHandler);
    document.querySelector(".button").addEventListener("click", resetHandler);
    window.addEventListener("keydown", keyHandler, false);
  }

  function sectionsHandler(section) {
    section.addEventListener("click", ret.nextSlide);
  }

  function keyHandler(e) {
    if (e.keyCode === KEYS.RIGHT) {
      ret.nextSlide();
    } else if (e.keyCode === KEYS.LEFT) {
      ret.previousSlide();
    }
  }

  function resetHandler() {
    for (let i = sections.length - 1; i >= 0; i--) {
      (function (index) {
        sections[index].classList.remove("leave");
        sections[index].scrollTop = 0;
      })(i);
    }
    sections[0].classList.add("active");
  }

  return ret;
})();

SLIDES_MODULE.init();

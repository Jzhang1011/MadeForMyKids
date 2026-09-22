      if (!location.hash) location.replace("#/");
      else render();
    } catch (err) {
      console.error(err);
      showLoadError(err);
    }
  }

  document.addEventListener("DOMContentLoaded", boot);
})();

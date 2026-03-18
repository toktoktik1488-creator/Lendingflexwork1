const revealElements = document.querySelectorAll(".reveal")

if ("IntersectionObserver" in window) {
  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) {
        return
      }

      entry.target.classList.add("is-visible")
      observer.unobserve(entry.target)
    })
  }, {
    threshold: 0.18
  })

  revealElements.forEach((element) => {
    if (!element.classList.contains("is-visible")) {
      revealObserver.observe(element)
    }
  })
} else {
  revealElements.forEach((element) => element.classList.add("is-visible"))
}

const officeForm = document.getElementById("officeForm")
const formStatus = document.getElementById("formStatus")

document.querySelectorAll("[data-target]").forEach((group) => {
  const targetField = document.getElementById(group.dataset.target)

  group.querySelectorAll(".choice-chip").forEach((button) => {
    button.addEventListener("click", () => {
      group.querySelectorAll(".choice-chip").forEach((item) => item.classList.remove("is-selected"))
      button.classList.add("is-selected")

      if (targetField) {
        targetField.value = button.dataset.value
      }
    })
  })
})

function validateChoiceField(fieldId, message) {
  const field = document.getElementById(fieldId)

  if (!field || field.value.trim()) {
    return true
  }

  formStatus.className = "form-status error"
  formStatus.textContent = message
  return false
}

if (officeForm && formStatus) {
  officeForm.addEventListener("submit", async (event) => {
    event.preventDefault()

    if (!validateChoiceField("readyForKyiv", "Оберіть, чи готові ви працювати у Києві.")) {
      return
    }

    if (!validateChoiceField("age", "Оберіть ваш вік.")) {
      return
    }

    if (!validateChoiceField("salesExperience", "Оберіть, чи є у вас досвід у продажах.")) {
      return
    }

    const submitButton = officeForm.querySelector("button[type='submit']")
    const formData = new FormData(officeForm)
    const payload = Object.fromEntries(formData.entries())

    formStatus.className = "form-status pending"
    formStatus.textContent = "Надсилаємо анкету..."

    if (submitButton) {
      submitButton.disabled = true
    }

    try {
      const response = await fetch("/office-request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      })

      let responseData = null

      try {
        responseData = await response.json()
      } catch (error) {
        responseData = null
      }

      if (!response.ok) {
        throw new Error(responseData && responseData.message ? responseData.message : "Request failed")
      }

      officeForm.reset()
      document.querySelectorAll(".choice-chip").forEach((button) => button.classList.remove("is-selected"))

      formStatus.className = "form-status success"
      formStatus.textContent = "Анкету надіслано. Менеджер зв'яжеться з вами найближчим часом."
    } catch (error) {
      formStatus.className = "form-status error"
      formStatus.textContent = error.message === "Telegram delivery failed"
        ? "Не вдалося доставити анкету в Telegram. Перевірте BOT_TOKEN і CHAT_ID на Railway."
        : "Не вдалося надіслати анкету. Спробуйте ще раз трохи пізніше."
    } finally {
      if (submitButton) {
        submitButton.disabled = false
      }
    }
  })
}


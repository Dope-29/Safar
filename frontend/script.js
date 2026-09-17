/* =========================================================
   SAFAR HOMEPAGE JAVASCRIPT
========================================================= */


/* =========================================================
   LANGUAGE DROPDOWN
========================================================= */

const languageBtn =
    document.getElementById("languageBtn");

const languageMenu =
    document.getElementById("languageMenu");

const selectedLanguage =
    document.getElementById("selectedLanguage");


languageBtn.addEventListener("click", function () {

    languageMenu.classList.toggle("show");

});


document
    .querySelectorAll(".language-menu button")
    .forEach(function (button) {

        button.addEventListener("click", function () {

            const language =
                this.dataset.language;

            selectedLanguage.textContent =
                language;

            languageMenu.classList.remove("show");

        });

    });


/* Close language menu */

document.addEventListener("click", function (event) {

    if (
        !languageBtn.contains(event.target) &&
        !languageMenu.contains(event.target)
    ) {

        languageMenu.classList.remove("show");

    }

});


/* =========================================================
   SWAP FROM / TO
========================================================= */

const fromInput =
    document.getElementById("from");

const toInput =
    document.getElementById("to");

const swapBtn =
    document.getElementById("swapBtn");


swapBtn.addEventListener("click", function () {

    const temporary =
        fromInput.value;

    fromInput.value =
        toInput.value;

    toInput.value =
        temporary;

});


/* =========================================================
   DATE
========================================================= */

const travelDate =
    document.getElementById("travelDate");


/* Prevent selecting past dates */

const today =
    new Date().toISOString().split("T")[0];

travelDate.min = today;


/* Default date = today */

travelDate.value = today;


/* =========================================================
   PASSENGER COUNTER
========================================================= */

const passengerSelector =
    document.getElementById("passengerSelector");

const passengerPopup =
    document.getElementById("passengerPopup");

const passengerDone =
    document.getElementById("passengerDone");


const adultCountElement =
    document.getElementById("adultCount");

const childCountElement =
    document.getElementById("childCount");

const passengerCount =
    document.getElementById("passengerCount");


let adults = 1;

let children = 0;


/* Open popup */

passengerSelector.addEventListener(
    "click",
    function (event) {

        event.stopPropagation();

        passengerPopup.classList.toggle("show");

    }
);


/* Increase / decrease */

document
    .querySelectorAll(".counter-btn")
    .forEach(function (button) {

        button.addEventListener("click", function () {

            const type =
                this.dataset.type;

            const action =
                this.dataset.action;


            if (type === "adult") {

                if (action === "plus") {

                    if (adults < 10) {
                        adults++;
                    }

                }

                if (action === "minus") {

                    if (adults > 1) {
                        adults--;
                    }

                }

            }


            if (type === "child") {

                if (action === "plus") {

                    if (children < 10) {
                        children++;
                    }

                }

                if (action === "minus") {

                    if (children > 0) {
                        children--;
                    }

                }

            }


            updatePassengerDisplay();

        });

    });


function updatePassengerDisplay() {

    adultCountElement.textContent =
        adults;

    childCountElement.textContent =
        children;


    const total =
        adults + children;


    if (total === 1) {

        passengerCount.textContent =
            "1 Passenger";

    } else {

        passengerCount.textContent =
            total + " Passengers";

    }

}


passengerDone.addEventListener(
    "click",
    function () {

        passengerPopup.classList.remove("show");

    }
);


/* Close passenger popup */

document.addEventListener("click", function (event) {

    if (
        !passengerPopup.contains(event.target) &&
        !passengerSelector.contains(event.target)
    ) {

        passengerPopup.classList.remove("show");

    }

});


/* =========================================================
   SEARCH BUS
========================================================= */

const searchBtn =
    document.getElementById("searchBtn");


searchBtn.addEventListener("click", function () {

    const from =
        fromInput.value.trim();

    const to =
        toInput.value.trim();

    const date =
        travelDate.value;


    /* Validate FROM */

    if (from === "") {

        alert("Please enter your departure city.");

        fromInput.focus();

        return;

    }


    /* Validate TO */

    if (to === "") {

        alert("Please enter your destination.");

        toInput.focus();

        return;

    }


    /* Same city */

    if (
        from.toLowerCase() ===
        to.toLowerCase()
    ) {

        alert(
            "Departure and destination cannot be the same."
        );

        return;

    }


    /* Validate date */

    if (date === "") {

        alert("Please select your travel date.");

        return;

    }


    const student =
        document.getElementById(
            "studentPreference"
        ).checked;


    const accessibility =
        document.getElementById(
            "accessibilityPreference"
        ).checked;


    const women =
        document.getElementById(
            "womenPreference"
        ).checked;


    const params = new URLSearchParams({
        from,
        to,
        date,
        adults,
        children,
        student,
        accessibility,
        women
    });

    window.location.href =
        "search-results.html?" + params.toString();

});


/* =========================================================
   USER SESSION
========================================================= */

const safarUser = JSON.parse(localStorage.getItem('safarUser') || 'null');
const safarToken = localStorage.getItem('safarToken');

if (safarUser && safarToken) {
    document.getElementById('accountLabel').textContent = safarUser.name.split(' ')[0];
    const myTrips = document.getElementById('myBookingsBtn');
    if (myTrips) {
        myTrips.style.display = 'inline-flex';
        myTrips.addEventListener('click', () => { window.location.href = 'my-bookings.html'; });
    }
}


/* =========================================================
   LOGIN MODAL
========================================================= */

const accountBtn =
    document.getElementById("accountBtn");

const loginModal =
    document.getElementById("loginModal");

const closeModal =
    document.getElementById("closeModal");


accountBtn.addEventListener(
    "click",
    function () {

        if (safarUser && safarToken) {
            window.location.href = 'my-bookings.html';
            return;
        }

        loginModal.classList.add("show");

    }
);


closeModal.addEventListener(
    "click",
    function () {

        loginModal.classList.remove("show");

    }
);


loginModal.addEventListener(
    "click",
    function (event) {

        if (event.target === loginModal) {

            loginModal.classList.remove("show");

        }

    }
);


/* =========================================================
   STUDENT VERIFICATION MODAL
========================================================= */

const studentBtn =
    document.getElementById("studentBtn");

const verifyStudentBtn =
    document.getElementById("verifyStudentBtn");

const studentModal =
    document.getElementById("studentModal");

const closeStudentModal =
    document.getElementById("closeStudentModal");


function openStudentModal() {

    studentModal.classList.add("show");

}


studentBtn.addEventListener(
    "click",
    openStudentModal
);


verifyStudentBtn.addEventListener(
    "click",
    openStudentModal
);


closeStudentModal.addEventListener(
    "click",
    function () {

        studentModal.classList.remove("show");

    }
);


studentModal.addEventListener(
    "click",
    function (event) {

        if (event.target === studentModal) {

            studentModal.classList.remove("show");

        }

    }
);


/* =========================================================
   STUDENT ID UPLOAD
========================================================= */

const uploadStudentBtn =
    document.getElementById(
        "uploadStudentBtn"
    );

const studentIdFile =
    document.getElementById(
        "studentIdFile"
    );


uploadStudentBtn.addEventListener(
    "click",
    function () {

        if (!studentIdFile.files.length) {

            alert(
                "Please select your student ID first."
            );

            return;

        }


        const file =
            studentIdFile.files[0];


        /*
            For now this is frontend only.

            Later:

            file
              ↓
            Backend
              ↓
            Admin / verification
              ↓
            Student status
              ↓
            Discount unlocked
        */


        localStorage.setItem(
            "studentVerificationStatus",
            "submitted"
        );


        alert(
            "Student ID submitted successfully. Your verification request has been received."
        );


        studentModal.classList.remove("show");

    }
);


/* =========================================================
   SAFETY
========================================================= */

const safetyBtn =
    document.getElementById("safetyBtn");


safetyBtn.addEventListener(
    "click",
    function () {

        alert(
            "SAFAR Safety: Emergency contacts, SOS and trip-sharing will be available during your journey."
        );

    }
);


/* =========================================================
   ESC KEY → CLOSE MODALS
========================================================= */

document.addEventListener(
    "keydown",
    function (event) {

        if (event.key === "Escape") {

            loginModal.classList.remove("show");

            studentModal.classList.remove("show");

            passengerPopup.classList.remove("show");

            languageMenu.classList.remove("show");

        }

    }
);
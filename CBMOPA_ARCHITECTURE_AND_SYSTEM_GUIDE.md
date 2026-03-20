# CB-MOPA: Causal-Bayesian Multi-Objective Process Analytics
**Comprehensive System Architecture and Technical Guide**

---

## 1. Executive Summary: What is CB-MOPA?

**CB-MOPA** is a real-time, AI-driven platform built for **Pharmaceutical Manufacturing**. In tablet production, plant managers are constantly fighting a war between two opposing forces:
1. **Strict Quality Compliance:** Tablets must have perfect hardness, dissolution rates, and disintegration times to ensure patient safety and meet FDA regulations.
2. **Environmental & Financial Cost:** The machinery required (granulators, dryers, tablet presses) consumes massive amounts of energy and generates a huge carbon footprint.

Standard machine learning struggles here because it only looks at *correlations*. If a machine learning model sees that high energy usage happens at the same time as perfect tablet hardness, it might blindly recommend using maximum energy all the time. 

**CB-MOPA solves this using a "Multi-Objective" approach driven by "Causal AI":**
Instead of guessing, the system uses actual physics and domain knowledge (Causal Models) to understand *exactly* how changing a machine setting (like reducing Dryer Temperature by 2 degrees) will affect the final tablet quality *and* the carbon footprint. When a live manufacturing batch starts going wrong (drifting), CB-MOPA uses advanced mathematics (Bayesian Optimization) to instantly calculate the cheapest, most energy-efficient machine settings required to save the batch, and asks a human to approve the change.

---

## 2. The Tech Stack

### Frontend (User Interface)
- **Vite & Vanilla Javascript:** The frontend is deliberately built without heavy frameworks like React. It uses extremely fast, modern "Vanilla" Javascript bundled by Vite. 
- **Vanilla CSS:** Custom styling utilizing modern aesthetic principles (glassmorphism, clean grid layouts, symmetric navigation) for a premium feel.
- **Plotly.js & Vis-Network.js:** Used for complex data charting (Pareto fronts, Time-series drift analysis) and interactive network graphing (the DAG editor).

### Backend (The API)
- **FastAPI (Python):** A lightning-fast, modern backend framework. It provides REST API endpoints that the frontend calls to get data or run ML models.
- **Uvicorn:** The lightning-fast ASGI web server that runs the FastAPI application.
- **Supabase:** Used as a BaaS (Backend-as-a-Service) to handle secure user authentication (login/signup) and to act as a permanent database for tracking the audit logs and historical decisions.

### Machine Learning & Mathematics Core
- **DoWhy:** Microsoft's library for Causal Inference. It builds Structural Causal Models (SCMs) to prove cause-and-effect relationships rather than just statistical correlations.
- **BoTorch & Ax:** Advanced libraries built on PyTorch for **Bayesian Optimization**. This is what generates the "Recommendations."
- **Dynamic Time Warping (DTW) & KMeans:** Used to analyze thousands of historical batches. DTW aligns time-series data of different lengths, and KMeans groups them together to figure out what a "perfect" batch looks like (Golden Envelopes).

---

## 3. Core ML Concepts Explained Simply

If someone asks you how the AI actually works, use these concepts:

### A. Directed Acyclic Graph (DAG)
A DAG is a flowchart that explains the laws of physics to the AI. It essentially says:
*Machine Speed -> causes -> High Energy Use*
*Compression Force -> causes -> Tablet Hardness*
Without a DAG, the AI is blind. The DAG forces the AI to only make recommendations that obey the laws of physics.

### B. Golden Signatures & Envelopes
Think of a "Golden Envelope" like the lane lines on a highway. The system analyzes past batches that resulted in perfect tablets and very low carbon emissions. It plots a mathematical "tunnel" (envelope) for every sensor (Temperature, RPMs, etc.). If a live batch stays inside this tunnel, it is guaranteed to be a "Golden" batch. If it drifts outside the lines, the alarm sounds.

### C. Bayesian Optimization 
When a batch drifts, Bayesian Optimization is the math that figures out how to fix it. Imagine you are blindfolded on a hilly golf course and trying to find the lowest point. Bayesian math takes a guess, measures the slope, and uses probability to quickly figure out exactly where to step next. In this system, it calculates the absolute best machine settings to fix the batch with the highest probability of success.

---

## 4. UI Walkthrough: Page by Page

### **1. Landing Page (`/`)**
The entry point. It introduces the product philosophy (Causal AI, Sustainability, HITL) and pushes the user to log in or enter the dashboard.

### **2. Dashboard (`/dashboard`)**
The high-level command center. 
- **Key Metrics:** Total batches, carbon emissions reduced, API health.
- **Pareto Front:** A scatter plot of past batches showing the absolute limit of efficiency. It visually proves to the user that they *can* achieve high quality with low energy.

### **3. In-Progress Live Batch (`/live-batch`)**
This simulates watching a batch manufacture in real-time.
- The user selects which "Golden Signature" they want the batch to follow.
- As the system "ticks" forward, live sensor data is plotted in real-time over the Golden Envelopes.
- If the live line goes outside the allowed maximum/minimum bounds, a **Drift Alert** is triggered, and the UI visually warns the operator.

### **4. Recommendations (`/recommendations`)**
The AI Co-Pilot. When a drift occurs, the operator comes here.
- The system displays the exact machine changes required to fix the drift (e.g., "Set Granulation Time to 14 mins").
- It shows *why* it recommends this: predicting that doing so will rescue the tablet Hardness while keeping CO2 under the limit.
- **Human-in-the-Loop (HITL):** The user must click **Accept** or **Reject**. The AI cannot change the machines itself. 

### **5. Golden Signatures (`/signatures`)**
The historical viewing room.
This page clusters past successful batches into groups (e.g., "Max Quality", "Deep Decarbonization"). Users can look at these groups to understand what the ideal time-series profiles looked like for different manufacturing goals.

### **6. Carbon Targets (`/carbon`)**
This handles ESG (Environmental, Social, Governance) compliance. Users input their facility's electrical grid emission factor here. If they are in a city run on coal, their factor is high; if running on solar, it is low. This math directly alters how aggressive the AI is when optimizing for energy.

### **7. Sandbox Simulation (`/simulation`)**
The training simulator.
- Instead of waiting for a real batch, a user can instantly simulate a batch moving through all 5 phases of manufacturing (Preparation -> Granulation -> Drying -> Compression -> Coating).
- At each step, they can manually override settings using sliders or let the AI take over.
- At the end, the system grades them on Quality and Carbon, and **automatically emails** an HTML report to the logged-in user.

### **8. DAG Editor (`/dag-editor`)**
The Engineer's interface to teach the AI physics.
It features a highly interactive, drag-and-drop structural graph. If an engineer installs a new piece of machinery, they come here to add it to the causal graph via JSON or a CSV file so the DoWhy causal engine knows about it. Refitting the models takes all this new knowledge into account.

### **9. History & Audit Logging (`/history`)**
Required for 21 CFR Part 11 (FDA Compliance). This page pulls from Supabase to show an immutable, unchangeable list of exactly *who* accepted an AI recommendation, what the recommendation was, and when it happened.

---

## 5. Potential Questions & How to Answer Them

**Q: Why don't you use standard predictive ML (like XGBoost or Neural Networks) instead of DoWhy?**
*A: Standard ML is purely correlative. If a standard model sees that the factory lights turn off when the machines stop, it might recommend turning off the lights to stop the machine. Causal inference (DoWhy) mathematically proves the direction of effect, ensuring our recommendations are grounded in physical reality, which is legally required in pharma.*

**Q: What happens if the internet goes down or SMTP email fails?**
*A: The system is designed with strict fallbacks. For example, if the API cannot reach the SMTP email server, it falls back to generating a local `.html` file and saving it safely in the backend `outbox/` directory.*

**Q: Why use Vanilla JS instead of React or Angular?**
*A: By avoiding Virtual DOM overhead, the UI is astronomically faster and lighter. We are streaming highly dense time-series chart data (Plotly) and running physics engines (for the DAG visualization) directly in the browser. Lightweight architecture prevents browser freezing.*

**Q: How do you handle Data Drift (when the machines wear down over years)?**
*A: The DAG Editor combined with the `Refit Models` API endpoint. As machines degrade or change, a domain expert can update the causal relationships in the DAG Editor and click "Refit". The backend spin up a background task to recalculate all 6 Structural Causal Models against the newest dataset without taking the server offline.*

**Q: Is the system fully autonomous? Can it run the factory by itself?**
*A: No. Due to strict pharmaceutical regulations, this system is strictly an "Assistive AI" operating heavily on a **Human-in-the-Loop (HITL)** framework. It calculates the optimal path, but a certified human operator must review the causal justification and explicitly click 'Accept' before any setting is applied to a physical machine.*

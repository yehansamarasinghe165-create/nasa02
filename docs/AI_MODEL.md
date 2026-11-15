# Field Shift — Complete Technical Documentation of the AI & Modeling System

This document describes the complete AI, machine learning, data pipeline, biophysical simulation, and decision-support architecture implemented in this repository.

> **Architecture summary:** This system does **not** use an LLM or generative AI. Instead, it combines:
> 1. **Offline Python data & ML pipeline** (`pipeline/`, `models/`, `packs/`, `scripts/build_all.py`) — ingests NASA satellite/climate observations and Sri Lankan agricultural statistics, runs a daily FAO-56 crop water-balance simulation, and trains/evaluates a **supervised ML paddy yield model**.
> 2. **Interactive simulation, market-feedback & multi-criteria ranking engine** (`web/src/lib/model.js`) — runs identically across the React PWA, FastAPI API (`api/main.py` via `web/scripts/plan_cli.mjs`), the 2021 backtest (`web/scripts/run_backtest.mjs`), and the Telegram/SMS bot table (`web/scripts/make_bot_table.mjs`).

---

## 1. End-to-End Pipeline & Data Flow

```text
  Raw Inputs
  ├── NASA POWER daily weather (0.5°, 1981–2021)        ──► pipeline/ingest_power.py
  ├── GPM IMERG V07 monthly rain (0.1°, 2001–2021)      ──► pipeline/ingest_imerg.py        [optional]
  ├── MODIS MOD13A3 NDVI (1 km, 2001–2021)              ──► pipeline/ingest_appeears.py     [optional]
  ├── SMAP L4 root-zone soil moisture (9 km, 2015–2021) ──► pipeline/ingest_appeears.py     [optional]
  ├── SRTM elevation/slope (30 m)                       ──► pipeline/ingest_srtm.py / appeears [optional]
  ├── ISRIC SoilGrids 2.0 (250 m, 0–30 cm)              ──► pipeline/ingest_soil.py         [optional]
  ├── Open-Meteo SEAS5 & CMIP6 projections              ──► pipeline/ingest_openmeteo.py    [optional]
  ├── DCS paddy yield & area Excel (1979–2025)          ──► pipeline/parse_dcs.py
  └── DCS highland areas, population, HARTI 2021 prices ──► pipeline/parse_csv.py
                                      │
                                      ▼
  Feature & Physics Layer
  ├── pipeline/features.py        ──► data/processed/daily/<district>.csv (with Penman-Monteith ET₀)
  │                               ──► data/processed/season_features.csv
  │                               ──► data/processed/climate_summary.json
  └── models/water_balance.py     ──► data/processed/water_balance.csv
                                  ──► data/processed/water_balance_summary.json
                                      │
                                      ▼
  Supervised ML Model (Paddy Yield)
  └── models/yield_ml.py          ──► models/artifacts/paddy_best.joblib (trained model artifact)
                                  ──► data/processed/yield_model.json    (metrics, intervals, SHAP/reasons, sensitivities)
                                      │
                                      ▼
  Web Pack Builder & Inference
  ├── packs/build_packs.py        ──► web/public/data/{crops,national,datasets,outlook}.json + packs/<district>.json
  ├── web/scripts/run_backtest.mjs──► web/public/data/backtest_2021.json
  ├── web/scripts/make_bot_table.mjs ► web/public/data/bot_table.json
  └── api/main.py                 ──► GET /api/yield/{district}/{season} (live ML what-if predictions)
                                  ──► POST /api/plan (calls web/scripts/plan_cli.mjs -> model.js)
```

Orchestrator script: `scripts/build_all.py` runs all steps in order (with `ingest_imerg.py`, `ingest_srtm.py`, and `ingest_openmeteo.py` treated as optional if downloads fail and cached files exist; `ingest_appeears.py` is run separately due to Earthdata queue times).

---

## 2. Season Calendar & Spatial Frame

- **Spatial units:** Sri Lanka's **25 districts**, defined in `web/public/geo/districts.json` (each with polygon geometry and centroid `lat`, `lon`).
- **Crop seasons** (`pipeline/features.py`), indexed by **harvest year $Y$**:
  - **Maha $Y$:** `1 Oct (Y - 1)` to `31 Mar (Y)`
  - **Yala $Y$:** `1 Apr (Y)` to `30 Sep (Y)`
  - Season slices with fewer than `170` daily observations are skipped.
- **Climate normal baseline:** `1991–2020` (`NORMAL = (1991, 2020)`).
- **Crops modeled (6 + Bare fallow):**
  1. `paddy` (Paddy, family `rice`, 105 days)
  2. `maize` (Maize, family `cereal`, 110 days)
  3. `greengram` (Green gram, family `legume`, 70 days)
  4. `cowpea` (Cowpea, family `legume`, 75 days)
  5. `bigonion` (Big onion, family `allium`, 100 days)
  6. `chilli` (Green chilli, family `solanaceae`, 150 days)

---

## 3. Data Ingestion & Feature Engineering (`pipeline/`)

### 3.1 Weather, Reference Evapotranspiration & Climate Features (`pipeline/ingest_power.py`, `pipeline/features.py`)

- **Raw variables:** Daily `T2M_MAX` (`tmax`, °C), `T2M_MIN` (`tmin`, °C), `PRECTOTCORR` (`rain`, mm/day), `RH2M` (`rh`, %), `WS2M` (`wind`, m/s at 2 m), and `ALLSKY_SFC_SW_DWN` (`solar`, $\text{MJ}/\text{m}^2/\text{day}$) from NASA POWER (`community=AG`) at each district's centroid (`1981–2021`). Sentinel values $\le -900$ are treated as missing.
- **Imputation:** Missing values (notably pre-1984 solar radiation) are filled per district with that calendar day-of-year's long-term mean.
- **Reference Evapotranspiration ($ET_0$):** Computed daily via the **FAO-56 Penman-Monteith equation** (`et0_penman_monteith`, Allen et al. 1998, eq. 6), using district elevation defaults (`ELEV`: `nuwara-eliya: 1500`, `badulla: 700`, `kandy: 500`, `matale: 400`, `kegalle: 200`, `ratnapura: 150`, `monaragala: 150`, others `50` m), floored at `0`.
- **Seasonal aggregations (`1982–2021`):**
  - `rain_mm`: total seasonal precipitation (mm)
  - `rain_days`: days with `rain >= 1` mm
  - `dry_spell_days`: longest consecutive run of days with `rain < 1` mm
  - `extreme_rain_days`: days with `rain > 50` mm
  - `et0_mm`: total seasonal $ET_0$ (mm)
  - `water_balance_mm`: `rain_mm - et0_mm`
  - `tmax_mean`, `tmin_mean`: seasonal mean daily max/min temperature (°C)
  - `heat_days`: days with `tmax > 35` °C
  - `gdd10`: growing degree days base 10 °C, $\sum \max\left(0, \frac{T_{\max} + T_{\min}}{2} - 10\right)$
  - `solar_mean`: mean solar radiation ($\text{MJ}/\text{m}^2/\text{day}$)
  - `onset_day` *(Maha only)*: starting from Sep 1 (`DOY 244`), the first day index $i$ where $\sum_{k=i}^{i+9} \text{rain}_k \ge 50\text{ mm}$ and $\sum_{k=i+10}^{i+29} \text{rain}_k \ge 20\text{ mm}$. Trend (`shiftDays`) is the linear regression slope (`np.polyfit`) over `1982–2020` multiplied by `(2020 - 1982)`.

### 3.2 Optional Satellite & Soil Features (`pipeline/ingest_*.py`, `features.py`)

- **GPM IMERG (`ingest_imerg.py`):** `GPM_3IMERGM.07` monthly precipitation ($0.1^\circ$, `2001–2021`), converted from $\text{mm/hr}$ to $\text{mm/month}$ and averaged across grid cells inside each district polygon (nearest cell fallback for small districts). Produces `imerg_rain_mm` (6-month seasonal sum).
- **MODIS Terra NDVI (`ingest_appeears.py`):** `MOD13A3.061` (1 km monthly, `2001–2021`, up to 5 sample points/district, valid range `(-0.2, 1]`). Produces `ndvi_early`: mean NDVI over the **first 3 months** of the season minus the `2001–2020` district-season mean.
- **SMAP L4 Soil Moisture (`ingest_appeears.py`):** `SPL4SMGP.008` (`sm_rootzone`, 9 km, `2015–2021`, `0 < sm < 1`). Produces `smap_anom`: 6-month seasonal mean minus `2015–2020` district-season mean (dashboard/evidence only; excluded from ML training due to short record).
- **SRTM Elevation (`ingest_srtm.py` / `ingest_appeears.py`):** 30 m elevation at 5-point crosses (`STEP = 0.005°` ≈ 550 m) per sample point; central-difference terrain slope `%` median per district (`terrain.csv`).
- **SoilGrids 2.0 (`ingest_soil.py`):** 250 m topsoil weighted average across `0–5`, `5–15`, `15–30 cm` (`weights = [5, 10, 15]`) for `phh2o`, `soc`, `nitrogen`, `sand`, `silt`, `clay`, mapped to texture class and available water capacity `awc_mm` (`80–170 mm/m`).
- **Open-Meteo Forecasts (`ingest_openmeteo.py`):**
  - *Next-season (ECMWF SEAS5):* computes 3-month % precipitation anomaly relative to SEAS5's own normal, then applies it to NASA POWER's `1991–2020` normal (`< -15%` below normal, `> +15%` above normal).
  - *2040s projections (CMIP6 HighResMIP):* `2040–2049` vs `1995–2014` across `EC_Earth3P_HR`, `MRI_AGCM3_2_S`, `CMCC_CM2_VHR4`.

### 3.3 Ground Truth & Economic Inputs (`pipeline/parse_dcs.py`, `pipeline/parse_csv.py`)

- **Paddy labels (`parse_dcs.py`):** Parses DCS `Average_Yeild-{Maha,Yala}_Season-1979-2025.xlsx` ($\text{kg/ha} \div 1000 \to \text{t/ha}$) and `Harvested_Extent` Excel sheets (with `Major`, `Minor`, `Rainfed`, `Total` breakdowns) into `data/processed/dcs_paddy.csv`.
- **Highland crops, prices & population (`parse_csv.py`):** Parses `pdf/csv/Highland_Crops_*.csv` (2020–2021 areas), `HARTI_2021_W35_Table16_Farmgate_Producer_Prices.csv` (+ `Table04` wholesale big onion × `0.8` assumed farmgate factor), and `Mid_Year_Population_2025.csv`.

---

## 4. Process-Based Crop Water Balance Model (`models/water_balance.py`)

Deterministic **FAO-56 single crop coefficient** daily soil-water bucket simulated across `1982–2021` for all 25 districts × 2 seasons × 6 crops:

- **Fixed sowing dates:** Oct 25 (`maha`), Apr 25 (`yala`).
- **Root-zone soil bucket parameters:** `TAW = 120.0 mm`, depletion fraction `p = 0.5` (`RAW = 60.0 mm`), initial depletion `0.5 * TAW`. Daily rainfall `< 1 mm` is ignored; excess above `TAW` drains.
- **Daily update equations** (over each crop stage's length and crop coefficient $K_c$):
  1. Potential crop evapotranspiration: $ET_c = K_c \cdot ET_0$
  2. Water-stress coefficient:
     $$K_s = \begin{cases} 1.0 & \text{if } D_r \le RAW \\ \max\left(0.0,\; \frac{TAW - D_r}{TAW - RAW}\right) & \text{otherwise} \end{cases}$$
  3. Actual evapotranspiration: $ET_a = K_s \cdot ET_c$
  4. Root-zone depletion update: $D_r \leftarrow \min\big(TAW,\; \max(0.0,\; D_r - P_{\text{eff}} + ET_a)\big)$
- **Paddy-specific water demand:** adds `150.0 mm` land preparation + `3.0 mm/day` percolation to total water `need_mm`.
- **FAO-33 relative yield under rainfed conditions:**
  $$\text{ratio\_rain} = \frac{\sum ET_a}{\sum ET_c}, \qquad \text{rel\_yield} = \max\big(0.0,\; 1 - K_y (1 - \text{ratio\_rain})\big)$$
- **Outputs:**
  - `data/processed/water_balance.csv` (feeds `wb_ratio` and `wb_irrig_mm` into the paddy ML model).
  - `data/processed/water_balance_summary.json` (`1991–2020` 10th/50th/90th percentiles + 2021 values for all 6 crops).

---

## 5. Supervised ML Paddy Yield Model (`models/yield_ml.py`)

This is the **trained supervised ML model** in the repository. Only **paddy** uses ML because only paddy has multi-decade district yield records (`dcs_paddy.csv`); the other 5 crops use national reference yields (`CROP_UPDATE` in `packs/build_packs.py`) adjusted by FAO-33 water stress.

### 5.1 Dataset Construction (`build()`)

- Merges `dcs_paddy.csv`, `season_features.csv`, and `water_balance.csv` (`crop == "paddy"`) on `["district", "season", "year"]`.
- **Target:** `yield_t_ha` (district × season paddy yield in tonnes per net hectare).
- **Lagged yield features** (computed strictly within `groupby(["district", "season"])` sorted by `year`):
  - `lag1`: yield in year $Y - 1$ (`shift(1)`)
  - `mean3`: rolling 3-year mean yield ending at year $Y - 1$ (`shift(1).rolling(3, min_periods=2).mean()`)
  - Rows missing `lag1` or `mean3` are dropped.
- **Training & evaluation split (`START = 2002`, `CV_YEARS = 2011..2020`, `TEST_YEAR = 2021`):**
  - Modeling window starts at `2002` (so all feature sets, including IMERG/NDVI which start in 2001 + lag, evaluate on identical sample rows).
  - Training pool: `2002–2020` (`assert d[train].year.max() <= 2020` prevents any 2021 leakage).
  - Held-out test year: `2021` (`Maha 2020/21` and `Yala 2021`), evaluated separately by season.

### 5.2 Input Features & Imputation

| Group | Features | Source | Imputation |
|---|---|---|---|
| `HISTORY` (5) | `lag1`, `mean3`, `rainfed_share`, `year`, `is_maha` | `dcs_paddy.csv` | `rainfed_share`: `(district, season)` median → `0` |
| `POWER` (12) | `rain_mm`, `rain_days`, `dry_spell_days`, `extreme_rain_days`, `et0_mm`, `water_balance_mm`, `tmax_mean`, `tmin_mean`, `heat_days`, `solar_mean`, `wb_ratio`, `wb_irrig_mm` | `season_features.csv` + `water_balance.csv` | Global column median across dataset |
| `IMERG` (1, optional) | `imerg_rain_mm` | `imerg_monthly.csv` | `(district, season)` median |
| `NDVI` (1, optional) | `ndvi_early` *(first 3 months of season — mid-season forecast)* | `ndvi_monthly.csv` | `(district, season)` median |
| Categorical (1) | `district` | `dcs_paddy.csv` | One-hot (`handle_unknown="ignore"`) or `pd.Categorical` |

### 5.3 Candidate Models & Hyperparameters

Three supervised regressors are trained and compared against two heuristic baselines:

1. **Ridge Regression:**
   - Pipeline: `ColumnTransformer([("num", StandardScaler(), num), ("dist", OneHotEncoder(handle_unknown="ignore"), ["district"])])` → `Ridge(alpha=3.0)`
2. **Random Forest:**
   - Pipeline: `ColumnTransformer([("num", "passthrough", num), ("dist", OneHotEncoder(handle_unknown="ignore"), ["district"])])` → `RandomForestRegressor(n_estimators=300, min_samples_leaf=3, random_state=0, n_jobs=-1)`
3. **LightGBM (`LGBM` wrapper):**
   - Passes `district` as a fixed-category `pd.Categorical` column → `LGBMRegressor(n_estimators=400, learning_rate=0.03, num_leaves=15, min_child_samples=15, subsample=0.8, subsample_freq=1, colsample_bytree=0.8, reg_lambda=1.0, random_state=0, verbose=-1)`
4. **Heuristic Baselines:**
   - `"Same as last year"`: predicts `lag1`
   - `"3-year average"`: predicts `mean3`

### 5.4 Nested Ablation, Expanding-Window CV & Selection

Up to **4 nested feature sets** are evaluated (`ablation`):
1. `Yield history only` (`HISTORY`)
2. `+ NASA POWER climate & water balance` (`HISTORY + POWER`)
3. `+ GPM IMERG rain` *(if `imerg_rain_mm` is non-null across rows)*
4. `+ MODIS NDVI (mid-season)` *(if `ndvi_early` is non-null across rows)*

For each feature set:
- **Expanding-window CV (`2011–2020`):** For each year $y \in \{2011, \dots, 2020\}$, models fit strictly on `d.year < y` and predict `d.year == y`. All pooled out-of-sample CV predictions give `cv_rmse` and `cv_r2`.
- **2021 Test Evaluation:** Models fit on `2002–2020` (`d.year <= 2020`) and score `Maha 2021` and `Yala 2021` separately (`test_maha_rmse`, `test_maha_r2`, `test_yala_rmse`, `test_yala_r2`).
- **Model Selection Rule:**
  - Within each feature set, keep the model with minimum `cv_rmse`.
  - Across feature sets, select the `(feature_set, model)` pair with the **lowest 2011–2020 `cv_rmse`**. **2021 test scores are never used for selection.**
  - Refit the winning pair on all `2002–2020` rows and serialize to `models/artifacts/paddy_best.joblib`.

### 5.5 Uncertainty Intervals, Explainability & Climate Sensitivity

- **80% Prediction Intervals (Empirical / Split-Conformal Style):**
  - Compute CV residuals from the chosen model's 2011–2020 expanding-window predictions: `resid = actual - pred`.
  - Extract 10th and 90th percentiles: `q_lo = resid.quantile(0.10)`, `q_hi = resid.quantile(0.90)`.
  - Any point prediction $\hat{y}$ receives the 80% interval $[\hat{y} + q_{\text{lo}},\; \hat{y} + q_{\text{hi}}]$.
  - `packs/build_packs.py` also applies `[base + q10, base + q90]` around the 2018–2020 DCS average paddy yield in each district's farmer pack.
- **Per-Prediction Drivers (`reasons`):**
  - If `best == "LightGBM"`: uses LightGBM's native `pred_contrib=True` (TreeSHAP additive contributions per feature).
  - If `best == "Ridge regression"`: computes exact standardized linear contributions $(x_j - \mu_j)/\sigma_j \cdot \beta_j$ for numeric features and $\beta_{\text{district}} - \overline{\beta}_{\text{district}}$ for `district`.
  - If `best == "Random forest"`: fits an auxiliary `LightGBM` on `2002–2020` to obtain `pred_contrib=True`.
  - Stores the top 3 features (excluding `year`) sorted by $|\text{effect\_t\_ha}|$ for each 2021 district-season prediction.
- **Global Feature Importance (`importance`):**
  - Normalized split-gain importance (`booster_.feature_importance("gain")`) from a `LightGBM` model trained on `2002–2020`.
- **What-If Perturbation (`what_if(x, rain_pct, temp_c)`):**
  - Given rainfall change $k = 1 + \text{rain\_pct}/100$:
    - `water_balance_mm += (k - 1) * rain_mm`
    - `rain_mm *= k` (and `imerg_rain_mm *= k` if present)
    - `wb_ratio = clip(wb_ratio * (1 + rain_pct / 200), 0, 1)`
  - Given temperature shift `temp_c` (°C):
    - `tmax_mean += temp_c`, `tmin_mean += temp_c`
    - `et0_mm *= (1 + 0.04 * temp_c)`
  - Evaluated on 2020 district-season rows with `+10%` rain and `+1°C` temperature to compute `rainPer10Pct` and `tempPerC` yield sensitivities (written into `national.json` by `packs/build_packs.py` for the Government Dashboard sliders).

### 5.6 Live API Serving (`api/main.py`)

`GET /api/yield/{district}/{season}?year=2021&rain_pct=0&temp_c=0`:
- Loads `models/artifacts/paddy_best.joblib` and the feature table from `yield_ml.build()`.
- Selects `(district, season, year)`, applies `what_if(x, rain_pct, temp_c)` if non-zero, and returns JSON with `predicted_t_ha`, `interval80_t_ha`, `baseline_t_ha`, `model`, `inputs`, `whatIf`, and `actual_t_ha`.

---

## 6. Rotation Simulation, Market Feedback & TOPSIS Engine (`web/src/lib/model.js`)

While `yield_ml.py` predicts paddy yields and `water_balance.py` computes seasonal rain ratios offline, interactive rotation planning, soil trajectories, market pricing, and national what-ifs run in `web/src/lib/model.js` (also invoked server-side by `api/main.py` `POST /api/plan` via `web/scripts/plan_cli.mjs`):

1. **Candidate Generation (`planRotations`):**
   - Evaluates all $6 \times 7 = 42$ `Maha × (6 crops + fallow)` rotations (plus the farmer's existing rotation).
   - Filters out rotations where any season has `suit === "fail"` (available water $< 50\%$ of requirement) or median annual profit $< 0$, while always keeping the existing rotation for comparison.
2. **Seasonal Crop Outcome (`seasonOutcome`):**
   - Water coverage ratio: `supply[waterSource] * (1 + (rainPct/100) * (1 if rain else 0.5))` where `packs/build_packs.py` models irrigation shortfall coverage as `tank: 90% Maha / 60% Yala`, `well: 50%`.
   - Yield multipliers:
     - Water stress (FAO-33): `clamp(1 - ky * (1 - ratio), 0.1, 1)`
     - Heat: `1 - 0.04 * tempC`
     - Crop-family pest penalty: `1 - 0.25 * pest[family]`
     - Soil nitrogen factor (non-legumes): `clamp(0.85 + 0.15 * (soilN / soilN_initial), 0.8, 1.1)`
3. **5-Year / 10-Season Soil Memory (`simulateRotation`):**
   - Simulates 5 years (10 seasons) carrying forward:
     - **Soil Nitrogen Index `n`** (clamped `15–120 kg/ha`): `fallow: -3`, legumes: `+0.4 * nFix`, others: `-6`.
     - **Soil Organic Carbon `soc`:** `soc + 0.02 * residueC - 0.012 * soc`.
     - **Erosion proxy:** `(1 - cover) * (1 + slope_pct / 5) * (seasonRain / 1000)` (`fallow cover = 0.2`).
     - **Family Pest Pressure (`pest[f]`):** `clamp(pest + 0.3, 0, 1)` when the same crop family repeats; `pest * 0.5` decay when rotated away.
4. **Cobweb Market Feedback (`priceShiftPct` & `web/scripts/run_backtest.mjs`):**
   - Computes expected price change from registered district area relative to baseline district area:
     $$\Delta P\% = \text{clamp}\left(\frac{(\text{planned\_area} + \text{extraHa}) / \text{district\_area} - 1}{\text{elasticity}} \times 100,\; -45,\; 45\right)$$
   - In the 2021 evaluation simulation (`run_backtest.mjs`), a **national market rule** stops recommending a crop once additional adoption would move its national price by more than `±15%` (`±5%` for rice), preventing the cobweb price crash seen when market feedback is disabled (`scenariosNoMarketRule`).
5. **TOPSIS Multi-Criteria Ranker (`topsis`):**
   - Ranks eligible rotations across 6 weighted criteria (`profit`, `risk` [10th-percentile profit], `water` [minimize], `soil` [maximize relative $\Delta N + \Delta SOC$], `erosion` [minimize], `pest` [minimize]):
     - Vector-normalizes each criterion column, multiplies by normalized farmer priority weights, determines ideal best/worst, and scores by closeness $d_{\text{worst}} / (d_{\text{best}} + d_{\text{worst}})$.
   - Returns the **top 3 recommendations + existing rotation**, with quantitative rule-based explanation cards (`explain`).
6. **National Dashboard What-If (`computeNational`):**
   - Applies per-district yield sensitivities (`rainPerPct`, `tempPerC`, `fertPerPct`) and area shifts (`shiftFrom` → `shiftTo` by `shiftPct`) to compute district/national production, N/P/K fertilizer demand, food balance surplus/deficit, calorie/protein coverage, and price pressure.

---

## 7. Blueprint Concepts vs. Implemented Code

| Topic | Described in `FIELD_SHIFT_BLUEPRINT.md` | Actually Implemented in Code |
|---|---|---|
| Water simulation | FAO-56 / AquaCrop-OSPy | Custom daily FAO-56 bucket (`models/water_balance.py`) |
| Conformal prediction | `MAPIE` library | Empirical 10th/90th CV residual quantiles (`models/yield_ml.py`) |
| Explainability | `shap` library | LightGBM `pred_contrib=True` + Ridge standardized coefficients (`models/yield_ml.py`) |
| Soil model | ICBM 2-pool + full RUSLE | Simplified 10-season `N` / `SOC` / cover-slope erosion / pest index (`web/src/lib/model.js`) |
| Satellite scope | Also mentions HLS, ECOSTRESS, GLDAS, GRACE-FO, Sentinel-1/2 | Implemented: NASA POWER, GPM IMERG, MODIS NDVI, SMAP L4, SRTM (`pipeline/`) + GIBS tile overlays (`DistrictMap.jsx`) |
| Current data in repo | `data/` & `models/artifacts/` | `.gitignore`d and not in Git; `web/scripts/make_sample.mjs` provides deterministic sample JSONs (`meta.sample = true`) until `scripts/build_all.py` is run with DCS `.xlsx` files. |

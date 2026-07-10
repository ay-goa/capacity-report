import { useEffect, useMemo, useRef, useState } from "react";
import {
  GoabMicrositeHeader,
  GoabAppHeader,
  GoabIcon,
  GoabAppFooter,
  GoabTabs,
  GoabTab,
  GoabTable,
  GoabTableSortHeader,
  GoabBadge,
  GoabPagination,
  GoabPushDrawer,
  GoabTemporaryNotificationCtrl,
  GoabRadioGroup,
  GoabRadioItem,
  GoabButton,
  GoabButtonGroup,
  GoabText,
  GoabSpacer,
  GoabDivider,
  GoabInputNumber,
} from "@abgov/react-components";
import { facilities as initialFacilities, reportMeta, totalFundedBeds, bedTypes } from "./data.js";
import "./App.css";

/* ── Helpers ───────────────────────────────────────────────────────────── */

const TABS = ["To-do reports", "Completed reports"];

/* ── Temporary (auto-dismissing) notification ─────────────────────────── */
/* GoabTemporaryNotificationCtrl has no slot for a child toast — it creates
   and manages its own goa-temp-notification internally, queued and shown in
   response to a "msg" CustomEvent dispatched on document.body (detail:
   { action: "goa:temp-notification", data: { message, type, duration } }).
   `duration` is ms until auto-hide. The ctrl itself is mounted once, with
   no props/children driving its content. */
function showToast(message, type = "success") {
  document.body.dispatchEvent(
    new CustomEvent("msg", {
      bubbles: true,
      composed: true,
      detail: { action: "goa:temp-notification", data: { message, type, duration: 5000 } },
    })
  );
}

function badgeTypeFor(status) {
  if (status === "Completed") return "success";
  if (status === "In progress") return "information";
  return "important"; // Not started
}

function actionLabelFor(status) {
  if (status === "Completed") return "View";
  if (status === "In progress") return "Edit";
  return "Start"; // Not started
}

// Sums a column of reasons-for-vacancy values, ignoring blanks; returns "-"
// if none of the rows have a value yet (matches the per-row "-" placeholder).
function sumColumn(values) {
  const filled = values.filter((v) => v !== null && v !== undefined && v !== "");
  if (filled.length === 0) return "-";
  return filled.reduce((sum, v) => sum + Number(v), 0);
}

function emptyChanges() {
  return { typeA: null, typeB: null, typeBSecure: null, typeC: null };
}

function makeFieldState() {
  // keyed by bedType.id -> { [fieldKey]: value }
  const state = {};
  bedTypes.forEach((t) => {
    state[t.id] = {};
    t.items.forEach((item) => {
      state[t.id][item.key] = item.thisWeek ?? "";
    });
  });
  return state;
}

/* ── Shared report header (inside the drawer) ─────────────────────────── */

function ReportMetaHeader() {
  return (
    <>
      <p className="meta-label">Reporting for the week of</p>
      <p className="meta-week-value">{reportMeta.reportingWeek}</p>
      <GoabSpacer vSpacing="s" />
      <div className="meta-grid">
        <div>
          <p className="meta-label">Report due</p>
          <p className="meta-value">{reportMeta.reportDue}</p>
        </div>
        <div>
          <p className="meta-label">Completed on</p>
          <p className="meta-value">{reportMeta.completedOn}</p>
        </div>
        <div>
          <p className="meta-label">Reporter</p>
          <p className="meta-value">{reportMeta.reporter}</p>
        </div>
      </div>
      <GoabSpacer vSpacing="s" />
      <GoabDivider />
      <GoabSpacer vSpacing="l" />
    </>
  );
}

/* ── Bed-type Yes/No row (shared by both flows) ───────────────────────── */

function BedTypeRow({ bedType, value, onChange, shaded, rowRef, onYesClick, thisWeekTotal }) {
  // Once a type's detail has been filled in and collapsed (by expanding a
  // different type), show a summary badge here so the entered total stays
  // visible without re-expanding the row.
  const showSummary = typeof thisWeekTotal === "number";
  return (
    <div className={`bedtype-row${shaded ? " shaded" : ""}`} ref={rowRef}>
      <div className="bedtype-row-label">
        <p className="bedtype-name">
          {bedType.label} <GoabBadge type="important" emphasis="subtle" content={`${bedType.fundedBeds} funded beds`} />
          {showSummary && (
            <>
              <GoabSpacer hSpacing="xs" />
              <GoabBadge type="information" emphasis="subtle" content={`This week's vacancies: ${thisWeekTotal}`} />
            </>
          )}
        </p>
        <p className="bedtype-subtitle">
          <strong>{bedType.subtitle}</strong> {bedType.description}
        </p>
      </div>
      {/* onClickCapture re-opens an already-"yes" but collapsed accordion:
          native radios don't fire onChange when re-selecting the same value. */}
      <div
        onClickCapture={(e) => {
          const item = e.target.closest?.("goa-radio-item");
          if (item?.getAttribute("value") === "yes") onYesClick?.();
        }}
      >
        <GoabRadioGroup
          name={`changes-${bedType.id}`}
          value={value ?? undefined}
          orientation="horizontal"
          onChange={({ value: v }) => onChange(v)}
        >
          <GoabRadioItem value="yes" label="Yes" />
          <GoabRadioItem value="no" label="No" />
        </GoabRadioGroup>
      </div>
    </div>
  );
}

/* ── Detail breakdown for a single bed type (shared "reasons" field set) ──
   Option B's wizard shows this as a standalone step, so it needs the type
   heading + step label + column headings; Option A's accordion shows it
   inline right below the Yes/No row that already names the type, so it
   skips straight to the field rows (pass stepLabel to show the former). ── */

function BedTypeDetail({ bedType, fields, onFieldChange, stepLabel }) {
  const totalAssigned = {
    lastWeek: sumColumn(bedType.items.map((item) => item.lastWeek)),
    thisWeek: sumColumn(bedType.items.map((item) => fields[item.key])),
  };
  // This week's vacancies can't exceed the type's funded-bed count.
  const hasError = typeof totalAssigned.thisWeek === "number" && totalAssigned.thisWeek > bedType.fundedBeds;
  return (
    <div className="bedtype-detail">
      {stepLabel && (
        <>
          <p className="detail-step-label">{stepLabel}</p>
          <GoabText tag="h3" size="heading-m" mb="none" mt="none">
            {bedType.label} <GoabBadge type="important" emphasis="subtle" content={`${bedType.fundedBeds} funded beds`} />
          </GoabText>
          <p className="bedtype-detail-subtitle">{bedType.subtitle}</p>
          <GoabSpacer vSpacing="s" />
        </>
      )}

      {/* Option A's accordion keeps the left accent bar (per Figma 02a.2);
          Option B's wizard steps sit flush with the rest of the step
          content instead (per Figma 02b.2-4). */}
      <div className={stepLabel ? "reasons-table-flush" : "reasons-table-accent"}>
        <div className={`reasons-table${hasError ? " has-error" : ""}`}>
          <div className="detail-col-headings-row">
            <span>Reasons for vacancy</span>
            <span className="detail-col-headings">
              <span>Last week’s vacancies</span>
              <span>This week’s vacancies</span>
            </span>
          </div>

          {bedType.items.map((item, i) => (
            <div className={`detail-row${i % 2 === 1 ? " shaded" : ""}`} key={item.key}>
              <div className="detail-row-label">
                <p className="detail-row-text"><strong>{item.label}</strong></p>
                {item.sublabel && <p className="detail-row-sublabel">{item.sublabel}</p>}
              </div>
              <div className="detail-row-inputs">
                <span className="detail-lastweek">{item.lastWeek ?? "-"}</span>
                <GoabInputNumber
                  name={`${bedType.id}-${item.key}`}
                  value={fields[item.key] ?? ""}
                  width="140px"
                  onChange={({ value }) => onFieldChange(bedType.id, item.key, value)}
                />
              </div>
            </div>
          ))}

          <div className="detail-total-row">
            <span>Total</span>
            <span className="detail-total-values">
              <span>{totalAssigned.lastWeek}</span>
              <span>{totalAssigned.thisWeek}</span>
            </span>
          </div>
        </div>

        {hasError && (
          <div className="reasons-error-message">
            <GoabIcon type="warning" theme="filled" size="small" />
            <p className="reasons-error-text">
              Total vacancies this week ({totalAssigned.thisWeek}) exceed the {bedType.fundedBeds} funded beds shown
              above. Need help? Visit the{" "}
              <a href="#" className="reasons-error-link">
                help page <GoabIcon type="open" size="small" />
              </a>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Smoking policy question (shared) ─────────────────────────────────── */

function SmokingPolicyQuestion({ value, onChange }) {
  return (
    <>
      <GoabText tag="h3" size="heading-m" mb="xs" mt="none">
        Does your facility have a smoking policy?
      </GoabText>
      <GoabText tag="p" size="body" mb="m">
        Please keep a copy of your policy handy in case it's requested for verification.
      </GoabText>
      <GoabRadioGroup name="smokingPolicy" value={value ?? undefined} onChange={({ value: v }) => onChange(v)}>
        <GoabRadioItem value="yes" label="Yes, we have a documented smoking policy." />
        <GoabRadioItem value="no" label="No, we don't have a smoking policy, but we are creating one." />
      </GoabRadioGroup>
    </>
  );
}

/* ── Option A: single drawer, inline accordion expansion ─────────────── */

function OptionADrawer({ facility, onClose, onSubmit }) {
  const [changes, setChanges] = useState(emptyChanges());
  const [fields, setFields] = useState(makeFieldState);
  const [smokingPolicy, setSmokingPolicy] = useState(null);
  const [expandedTypeId, setExpandedTypeId] = useState(null);
  const rowRefs = useRef({});

  function handleFieldChange(typeId, fieldKey, value) {
    setFields((prev) => ({ ...prev, [typeId]: { ...prev[typeId], [fieldKey]: value } }));
  }

  // Only one bed type's detail can be expanded at a time. Selecting "yes"
  // on a type expands it and collapses whichever other type was open;
  // selecting "no" on the currently expanded type collapses it.
  function handleChangeAnswer(typeId, value) {
    setChanges((prev) => ({ ...prev, [typeId]: value }));
    setExpandedTypeId(value === "yes" ? typeId : (prev) => (prev === typeId ? null : prev));
  }

  // Re-clicking "yes" on a type that's already "yes" but collapsed re-opens it.
  function handleRequestExpand(typeId) {
    setExpandedTypeId(typeId);
  }

  // Whenever a bed type expands, scroll its row to the top of the drawer's
  // scrollable area so the type name/description is visible, even if the
  // user had scrolled further down (e.g. to a later type) beforehand.
  // The panel's own styles set `transition: all`, which animates its height
  // as rows expand/collapse — reading positions before that settles produces
  // a wrong target. Waiting a frame lets it settle, then we animate to the
  // (now-correct) target ourselves.
  // GoabPushDrawer renders one of two internal elements depending on
  // viewport width — `goa-drawer` (overlay, narrow) or
  // `goa-push-drawer-internal` (push, wide, forced into overlay mode by
  // the CSS patch below) — both wrap the same goa-scroll-panel structure.
  useEffect(() => {
    if (!expandedTypeId) return;
    const rowEl = rowRefs.current[expandedTypeId];
    const modalEl = document.querySelector("goa-push-drawer");
    const scrollEl = modalEl?.shadowRoot
      ?.querySelector("goa-drawer, goa-push-drawer-internal")
      ?.shadowRoot?.querySelector("goa-scroll-panel")
      ?.shadowRoot?.querySelector(".scroll-panel-content");
    if (!rowEl || !scrollEl) return;
    const raf = requestAnimationFrame(() => {
      const delta = rowEl.getBoundingClientRect().top - scrollEl.getBoundingClientRect().top;
      scrollEl.scrollTo({ top: scrollEl.scrollTop + delta, behavior: "smooth" });
    });
    return () => cancelAnimationFrame(raf);
  }, [expandedTypeId]);

  return (
    <GoabPushDrawer
      open
      heading={facility.name}
      width="940px"
      onClose={onClose}
      actions={
        <GoabButtonGroup alignment="start">
          <GoabButton type="tertiary" onClick={onClose}>Save and enter later</GoabButton>
          <GoabButton type="primary" onClick={() => onSubmit(facility.id)}>Submit report</GoabButton>
        </GoabButtonGroup>
      }
    >
      <div className="drawer-body">
        <ReportMetaHeader facilityName={facility.name} />

        <GoabText tag="h2" size="heading-m" mb="xs" mt="none">
          Review last week's bed numbers.
        </GoabText>
        <GoabText tag="p" size="body" mb="m">
          If any numbers have changed since last week, select the option below and enter the updated numbers.
        </GoabText>

        <div className="bedtype-list">
          <div className="bedtype-total-row">
            <span>Total funded beds: {totalFundedBeds}</span>
            <span className="bedtype-total-row-headings">
              <span>Changes since last week?</span>
            </span>
          </div>

          {bedTypes.map((bt, i) => (
            <div key={bt.id}>
              <BedTypeRow
                bedType={bt}
                shaded={i % 2 === 1}
                value={changes[bt.id]}
                onChange={(v) => handleChangeAnswer(bt.id, v)}
                rowRef={(el) => { rowRefs.current[bt.id] = el; }}
                onYesClick={() => handleRequestExpand(bt.id)}
                thisWeekTotal={
                  expandedTypeId !== bt.id
                    ? sumColumn(bt.items.map((item) => fields[bt.id][item.key]))
                    : undefined
                }
              />
              {expandedTypeId === bt.id && (
                <BedTypeDetail
                  bedType={bt}
                  fields={fields[bt.id]}
                  onFieldChange={handleFieldChange}
                />
              )}
            </div>
          ))}
        </div>

        <GoabSpacer vSpacing="2xl" />
        <SmokingPolicyQuestion value={smokingPolicy} onChange={setSmokingPolicy} />
        <GoabSpacer vSpacing="xl" />
      </div>
    </GoabPushDrawer>
  );
}

/* ── Option B: drawer with multi-step wizard ──────────────────────────── */

function OptionBDrawer({ facility, onClose, onSubmit }) {
  const [changes, setChanges] = useState(emptyChanges());
  const [fields, setFields] = useState(makeFieldState);
  const [smokingPolicy, setSmokingPolicy] = useState(null);
  const [stepIndex, setStepIndex] = useState(0); // 0 = main page; 1..n = detail steps

  function handleFieldChange(typeId, fieldKey, value) {
    setFields((prev) => ({ ...prev, [typeId]: { ...prev[typeId], [fieldKey]: value } }));
  }

  // Only bed types marked "yes" get their own wizard step, in display order.
  const yesTypes = useMemo(
    () => bedTypes.filter((bt) => changes[bt.id] === "yes"),
    [changes]
  );
  const totalSteps = yesTypes.length + 1; // +1 for the main review step
  const currentDetailType = stepIndex > 0 ? yesTypes[stepIndex - 1] : null;
  const isLastStep = stepIndex === totalSteps - 1;

  function goNext() {
    setStepIndex((s) => Math.min(s + 1, totalSteps - 1));
  }
  function goBack() {
    setStepIndex((s) => Math.max(s - 1, 0));
  }

  return (
    <GoabPushDrawer
      open
      heading={facility.name}
      width="940px"
      onClose={onClose}
      actions={
        stepIndex === 0 ? (
          <GoabButtonGroup alignment="start">
            <GoabButton type="tertiary" onClick={onClose}>Save and enter later</GoabButton>
            {yesTypes.length > 0 ? (
              <GoabButton type="primary" onClick={goNext}>
                Next step: {yesTypes[0].label} bed changes
              </GoabButton>
            ) : (
              <GoabButton type="primary" onClick={() => onSubmit(facility.id)}>Submit report</GoabButton>
            )}
          </GoabButtonGroup>
        ) : (
          <GoabButtonGroup alignment="start">
            <GoabButton type="tertiary" onClick={goBack}>Back</GoabButton>
            {isLastStep ? (
              <GoabButton type="primary" onClick={() => onSubmit(facility.id)}>Submit report</GoabButton>
            ) : (
              <GoabButton type="primary" onClick={goNext}>
                Next step: {yesTypes[stepIndex].label} bed changes
              </GoabButton>
            )}
          </GoabButtonGroup>
        )
      }
    >
      <div className="drawer-body">
        {stepIndex === 0 ? (
          <>
            <ReportMetaHeader />

            <GoabText tag="h2" size="heading-m" mb="xs" mt="none">
              Review last week's bed numbers.
            </GoabText>
            <GoabText tag="p" size="body" mb="m">
              If any numbers have changed since last week, select the option below and enter the updated numbers.
            </GoabText>

            <div className="bedtype-list">
              <div className="bedtype-total-row">
                <span>Total funded beds: {totalFundedBeds}</span>
                <span className="bedtype-total-row-headings">
                  <span>Changes since last week?</span>
                </span>
              </div>
              {bedTypes.map((bt, i) => (
                <BedTypeRow
                  key={bt.id}
                  bedType={bt}
                  shaded={i % 2 === 1}
                  value={changes[bt.id]}
                  onChange={(v) => setChanges((prev) => ({ ...prev, [bt.id]: v }))}
                />
              ))}
            </div>

            <GoabSpacer vSpacing="2xl" />
            <SmokingPolicyQuestion value={smokingPolicy} onChange={setSmokingPolicy} />
            <GoabSpacer vSpacing="xl" />
          </>
        ) : (
          <>
            <BedTypeDetail
              bedType={currentDetailType}
              fields={fields[currentDetailType.id]}
              onFieldChange={handleFieldChange}
              stepLabel={`Step ${stepIndex + 1} of ${totalSteps}`}
            />
            <GoabSpacer vSpacing="xl" />
          </>
        )}
      </div>
    </GoabPushDrawer>
  );
}

/* ── Capacity reports overview (home page) ────────────────────────────── */

function HomePage({ facilities, onOpenFacility }) {
  const [activeTab, setActiveTab] = useState(0); // "To-do reports" by default
  const [pageNumber, setPageNumber] = useState(1);
  const perPageCount = 10;

  // "To-do reports" covers both "In progress" and "Not started" statuses;
  // "Completed reports" covers "Completed".
  const counts = useMemo(() => {
    const c = { "To-do reports": 0, "Completed reports": 0 };
    facilities.forEach((f) => {
      const key = f.status === "Completed" ? "Completed reports" : "To-do reports";
      c[key] += 1;
    });
    return c;
  }, [facilities]);

  const filtered = useMemo(() => {
    const tabLabel = TABS[activeTab];
    if (tabLabel === "Completed reports") return facilities.filter((f) => f.status === "Completed");
    return facilities.filter((f) => f.status !== "Completed");
  }, [facilities, activeTab]);

  return (
    <div className="app-root">
      <GoabMicrositeHeader type="live" version="UAT 1.2.3" />
      <div className="app-header-row">
        <GoabAppHeader heading="Assisted Living" secondaryText="Capacity Reporting and Monitoring" url="#" />
        <div className="user-chip">
          <div className="user-chip-avatar">
            <GoabIcon type="person-circle" size="medium" />
          </div>
          <div className="user-chip-info">
            <p className="user-chip-name">Jamie Chen</p>
            <p className="user-chip-email">jamie.chen@gov.ab.ca</p>
          </div>
          <GoabIcon type="chevron-down" size="small" />
        </div>
      </div>

      <main className="content-inner">
        <GoabText tag="h2" size="heading-l" mb="l">
          Capacity reports overview
        </GoabText>

        <GoabTabs initialTab={activeTab + 1} onChange={({ tab }) => { setActiveTab(tab - 1); setPageNumber(1); }}>
          {TABS.map((label) => (
            <GoabTab
              key={label}
              heading={
                <>
                  {label} <GoabBadge type="information" content={String(counts[label] ?? 0)} />
                </>
              }
            />
          ))}
        </GoabTabs>

        <GoabSpacer vSpacing="m" />

        <GoabTable width="100%">
          <thead>
            <tr>
              <th><GoabTableSortHeader name="name">Facility name</GoabTableSortHeader></th>
              <th><GoabTableSortHeader name="dueDate">Report due date</GoabTableSortHeader></th>
              <th><GoabTableSortHeader name="submittedDate">Report submitted date</GoabTableSortHeader></th>
              <th><GoabTableSortHeader name="status">Status</GoabTableSortHeader></th>
              <th>Reporter name</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((f) => (
              <tr key={f.id}>
                <td>{f.name}</td>
                <td>{f.dueDate}</td>
                <td>{f.submittedDate ?? "-"}</td>
                <td><GoabBadge type={badgeTypeFor(f.status)} emphasis="subtle" content={f.status} /></td>
                <td>{f.reporter}</td>
                <td>
                  {f.flow ? (
                    <a href="#" className="facility-link" onClick={(e) => { e.preventDefault(); onOpenFacility(f.id); }}>
                      {actionLabelFor(f.status)}
                    </a>
                  ) : (
                    <span className="facility-link static">{actionLabelFor(f.status)}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </GoabTable>

        <GoabSpacer vSpacing="m" />
        <GoabPagination
          itemCount={filtered.length}
          perPageCount={perPageCount}
          pageNumber={pageNumber}
          onChange={({ page }) => setPageNumber(page)}
        />
      </main>

      <GoabAppFooter>
        <a href="#">Need help? Technical support</a>
      </GoabAppFooter>
    </div>
  );
}

/* ── App ───────────────────────────────────────────────────────────────── */

export default function App() {
  const [facilities, setFacilities] = useState(initialFacilities);
  const [openFacilityId, setOpenFacilityId] = useState(null);

  /* ── Temp notification icon/text gap fix ── */
  /* goa-temp-notification's icon and message sit in a flex row using the
     16px (spacer M) gap token; override to the requested 12px (spacer S).
     The row also has flex-wrap:wrap, which — for longer messages whose
     unwrapped width barely exceeds the remaining space — wraps the icon
     and message onto separate (stacked) lines instead of wrapping the
     text itself. Force nowrap so the icon always stays beside the text,
     letting the message wrap internally across multiple lines instead.
     The toast itself is created by goa-temp-notification-ctrl inside its
     own shadow root (not slotted), so patching it means reaching through
     a nested shadow boundary — a MutationObserver on the ctrl's shadow
     root catches the toast whenever the ctrl creates one. */
  useEffect(() => {
    const STYLE_ID = "temp-notification-gap-fix";
    const CSS = `
      .snackbar {
        gap: var(--goa-space-s, 12px) !important;
        flex-wrap: nowrap !important;
        align-items: flex-start !important;
      }
    `;
    function inject(root) {
      if (!root || root.getElementById(STYLE_ID)) return;
      const s = document.createElement("style");
      s.id = STYLE_ID;
      s.textContent = CSS;
      root.appendChild(s);
    }
    function watchCtrl(ctrlEl) {
      if (ctrlEl.__gapFixWatched) return;
      ctrlEl.__gapFixWatched = true;
      const ctrlRoot = ctrlEl.shadowRoot;
      if (!ctrlRoot) return;
      function tryPatch() {
        const toast = ctrlRoot.querySelector("goa-temp-notification");
        if (toast?.shadowRoot) inject(toast.shadowRoot);
      }
      tryPatch();
      const innerObserver = new MutationObserver(tryPatch);
      innerObserver.observe(ctrlRoot, { childList: true, subtree: true });
    }
    function patchAll() {
      document.querySelectorAll("goa-temp-notification-ctrl").forEach(watchCtrl);
    }
    patchAll();
    const observer = new MutationObserver(patchAll);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  /* ── Push-drawer: force overlay presentation at every width ── */
  /* GoabPushDrawer switches to a true "push" layout (shrinking the main
     content in the flex row) above a hardcoded 1023px internal breakpoint,
     falling back to a fixed-position overlay only below it. The Figma
     reference always shows the overlay style (dimmed backdrop, full-width
     table underneath), so pin the panel itself to a fixed position
     regardless of width; the dimmed backdrop is rendered separately below. */
  useEffect(() => {
    const STYLE_ID = "push-drawer-overlay-fix";
    const CSS = `
      goa-push-drawer-internal {
        position: fixed !important;
        top: 0 !important;
        right: 0 !important;
        height: 100vh !important;
        z-index: 1000;
        box-shadow: -4px 0 16px rgba(0, 0, 0, 0.15);
      }
    `;
    function patchDrawer(el) {
      const root = el.shadowRoot;
      if (!root || root.getElementById(STYLE_ID)) return;
      const s = document.createElement("style");
      s.id = STYLE_ID;
      s.textContent = CSS;
      root.appendChild(s);
    }
    function patchAll() {
      document.querySelectorAll("goa-push-drawer").forEach(patchDrawer);
    }
    patchAll();
    const observer = new MutationObserver(patchAll);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  /* ── Push-drawer: stop the bottom-edge settle animation on open ── */
  /* goa-push-drawer-internal's own panel div separately transitions its
     margin/height (on top of the slide-in above) to snap its bottom edge
     flush once mounted, which shows up as a visible 16px jump/bounce right
     after the panel appears. Disabling that inner transition removes the
     bounce while leaving the actual slide-in (on the outer element) intact. */
  useEffect(() => {
    const STYLE_ID = "push-drawer-settle-fix";
    const CSS = `
      .goa-push-drawer {
        transition: none !important;
      }
    `;
    function patchInternal(el) {
      const root = el.shadowRoot;
      if (!root || root.getElementById(STYLE_ID)) return;
      const s = document.createElement("style");
      s.id = STYLE_ID;
      s.textContent = CSS;
      root.appendChild(s);
    }
    // goa-push-drawer-internal is rendered asynchronously inside goa-push-drawer's
    // shadow root, so it may not exist yet the moment goa-push-drawer itself lands
    // in the body. A nested observer on that shadow root catches it whenever it
    // does appear — the outer body-level observer alone can miss this race, since
    // shadow-root mutations don't bubble up to a light-DOM subtree observer.
    function watchOuter(el) {
      if (el.__settleFixWatched) return;
      el.__settleFixWatched = true;
      const outerRoot = el.shadowRoot;
      if (!outerRoot) return;
      function tryPatch() {
        const internal = outerRoot.querySelector("goa-push-drawer-internal");
        if (internal) patchInternal(internal);
      }
      tryPatch();
      const innerObserver = new MutationObserver(tryPatch);
      innerObserver.observe(outerRoot, { childList: true, subtree: true });
    }
    function patchAll() {
      document.querySelectorAll("goa-push-drawer").forEach(watchOuter);
    }
    patchAll();
    const observer = new MutationObserver(patchAll);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  const openFacility = facilities.find((f) => f.id === openFacilityId) || null;

  function handleOpenFacility(id) {
    setOpenFacilityId(id);
  }

  function handleCloseDrawer() {
    setOpenFacilityId(null);
  }

  function handleSubmit(id) {
    const facility = facilities.find((f) => f.id === id);
    setFacilities((prev) =>
      prev.map((f) =>
        f.id === id
          ? { ...f, status: "Completed", submittedDate: "Today", reporter: "Jamie Chen" }
          : f
      )
    );
    setOpenFacilityId(null);
    showToast(`${facility.name} report has been successfully submitted.`);
  }

  return (
    <div className="app-shell">
      <HomePage facilities={facilities} onOpenFacility={handleOpenFacility} />

      {openFacility && <div className="drawer-backdrop" onClick={handleCloseDrawer} />}

      {openFacility?.flow === "A" && (
        <OptionADrawer key={openFacility.id} facility={openFacility} onClose={handleCloseDrawer} onSubmit={handleSubmit} />
      )}
      {openFacility?.flow === "B" && (
        <OptionBDrawer key={openFacility.id} facility={openFacility} onClose={handleCloseDrawer} onSubmit={handleSubmit} />
      )}

      <GoabTemporaryNotificationCtrl verticalPosition="bottom" horizontalPosition="left" />
    </div>
  );
}

(()=>{
  const page=document.querySelector('[data-page="trip"]');
  if(!page)return;

  const style=document.createElement('style');
  style.textContent=`
    #tripRouteOverview,#dayPlanHelp,#workspaceStops,#itineraryModelPanel{display:none!important}
    .trip-workspace-clean-note{font-size:10px;color:#667;line-height:1.4;margin-top:5px}
  `;
  document.head.appendChild(style);

  function removeRedundant(){
    ['tripRouteOverview','dayPlanHelp','workspaceStops','itineraryModelPanel'].forEach(id=>document.getElementById(id)?.remove());
    document.querySelectorAll('#workspaceLogistics .trip-legacy-logistics').forEach(el=>el.remove());

    const intro=page.querySelector('.trip-workspace-intro');
    const summary=document.getElementById('tripSummary');
    const next=document.getElementById('tripNextActions');
    const logistics=document.getElementById('workspaceLogistics');
    const itinerary=document.getElementById('workspaceItinerary');
    const exportSection=document.getElementById('workspaceExport');

    if(intro){
      const copy=intro.querySelector('p');
      if(copy)copy.textContent='Set the trip details, work through each day, then export the finished plan when it is ready.';
      const nav=intro.querySelector('.trip-workspace-jumps');
      if(nav)nav.innerHTML='<a href="#tripNextActions">Next actions</a><a href="#workspaceLogistics">Trip details</a><a href="#workspaceItinerary">Itinerary</a><a href="#workspaceExport">Export</a>';
    }

    // Canonical working order: summary → next actions → trip details → itinerary → export.
    let anchor=intro;
    for(const el of [summary,next,logistics,itinerary,exportSection]){
      if(!el||!anchor)continue;
      anchor.insertAdjacentElement('afterend',el);
      anchor=el;
    }

    if(logistics){
      const head=logistics.querySelector('.trip-workspace-section-head h2');
      if(head)head.textContent='Trip details';
      const help=logistics.querySelector('.trip-workspace-section-head p');
      if(help)help.textContent='Dates, start/return location and optional trip-wide information.';
    }
    if(itinerary){
      const head=itinerary.querySelector('.trip-workspace-section-head h2');
      if(head)head.textContent='Day-by-day itinerary';
      const help=itinerary.querySelector('.trip-workspace-section-head p');
      if(help)help.textContent='Assign days, order stops, add notes and capture camping details here.';
    }

    // The v1.16 editor is now the only visible stop/day editor.
    const dayEditor=document.getElementById('tripDayEditor');
    if(dayEditor&&itinerary&&!itinerary.contains(dayEditor))itinerary.appendChild(dayEditor);

    // Remove obsolete "advanced" wording now that the legacy stop editor is gone.
    document.querySelectorAll('.trip-day-editor-head p').forEach(p=>{
      p.textContent='Change day assignments, stop order, notes and camping details directly in the itinerary.';
    });

    // Canonical readiness renderer is the logistics/readiness implementation from v1.15.1+.
    if(window.TripLogisticsFix?.renderReadiness){
      window.TripNextActions=window.TripNextActions||{};
      window.TripNextActions.render=window.TripLogisticsFix.renderReadiness;
      window.TripNextActions.actionsFor=window.TripLogisticsFix.readinessActions;
      window.TripLogisticsFix.renderReadiness();
    }
  }

  removeRedundant();
  setTimeout(removeRedundant,150);
  setTimeout(removeRedundant,600);
  document.addEventListener('trip-logistics-saved',()=>setTimeout(removeRedundant,60));
  document.addEventListener('click',e=>{
    if(e.target&&['saveTripDayEditor','saveTripLogisticsBtn','saveTripLocationsBtn'].includes(e.target.id))setTimeout(removeRedundant,180);
  });
  window.TripWorkspaceCleanup={apply:removeRedundant};
})();

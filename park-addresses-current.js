(()=>{const details=window.PARK_DETAILS||{};window.PARK_ADDRESSES=Object.fromEntries(Object.entries(details).map(([slug,d])=>[slug,d&&d.address||'']));})();

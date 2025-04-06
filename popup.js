function getTabGroupKey(tabUrl) {
  try {
    const url = new URL(tabUrl);
    const domain = url.hostname;
    const path = url.pathname;
    const segments = path.split('/').filter(Boolean);
    let keySegment = segments[0] || '';

    if (path.includes('/d/')) {
      keySegment = path.substring(0, path.indexOf('/d/'));
    }

    return `${domain}/${keySegment}`;
  } catch (e) {
    return null;
  }
}

function formatTimestamp(ms) {
  const date = new Date(ms);
  return date.toLocaleString();
}

function getTimeLabel(diffMs) {
  const diffMin = diffMs / 60000;
  if (diffMin < 15) return '< 15 min';
  if (diffMin < 60) return '< 1 hr';
  if (diffMin < 360) return '< 6 hr';
  if (diffMin < 1440) return '< 1 day';
  if (diffMin < 10080) return '< 1 week';
  return '≥ 1 week';
}

document.addEventListener('DOMContentLoaded', () => {
  chrome.tabs.query({}, tabs => {
    const groups = {};

    tabs.forEach(tab => {
      if (!tab.url || tab.url === 'chrome://newtab/') return;

      const url = new URL(tab.url);
      const hostname = url.hostname;
      if (!groups[hostname]) groups[hostname] = [];
      groups[hostname].push(tab);
    });

    const sortedHosts = Object.keys(groups).sort((a, b) => {
      const aLatest = Math.max(...groups[a].map(t => t.lastAccessed));
      const bLatest = Math.max(...groups[b].map(t => t.lastAccessed));
      return bLatest - aLatest;
    });

    const container = document.getElementById('tabList');
    container.innerHTML = '';
    const now = Date.now();

    sortedHosts.forEach(hostname => {
      const groupDiv = document.createElement('div');
      groupDiv.className = 'group';

      const latestTab = groups[hostname].reduce((prev, curr) => prev.lastAccessed > curr.lastAccessed ? prev : curr);
      const timeLabel = getTimeLabel(now - latestTab.lastAccessed);

      const header = document.createElement('div');
      header.className = 'group-header';
      header.textContent = hostname;

      const labelSpan = document.createElement('span');
      labelSpan.className = 'group-label';
      labelSpan.textContent = `(${timeLabel})`;
      header.appendChild(labelSpan);

      groupDiv.appendChild(header);

      const tabList = document.createElement('div');
      tabList.style.display = 'none';

      groups[hostname].sort((a, b) => b.lastAccessed - a.lastAccessed);
      groups[hostname].forEach(tab => {
        const tabEntry = document.createElement('div');
        tabEntry.className = 'tab-link';

        const tabContent = document.createElement('div');
        tabContent.className = 'tab-content';
        tabContent.textContent = tab.title || tab.url;
        tabContent.onclick = () => {
          chrome.tabs.update(tab.id, { active: true });
          chrome.windows.update(tab.windowId, { focused: true });
        };

        const timeSpan = document.createElement('span');
        timeSpan.className = 'timestamp';
        timeSpan.textContent = `(${formatTimestamp(tab.lastAccessed)})`;

        const closeBtn = document.createElement('span');
        closeBtn.className = 'close-btn';
        closeBtn.textContent = 'X';
        closeBtn.onclick = (e) => {
          e.stopPropagation();
          chrome.tabs.remove(tab.id, () => {
            tabEntry.remove();
          });
        };

        tabEntry.appendChild(tabContent);
        tabEntry.appendChild(timeSpan);
        tabEntry.appendChild(closeBtn);
        tabList.appendChild(tabEntry);
      });

      header.onclick = () => {
        tabList.style.display = tabList.style.display === 'none' ? 'block' : 'none';
      };

      groupDiv.appendChild(tabList);
      container.appendChild(groupDiv);
    });
  });
});
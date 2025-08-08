'use strict';

const build = require('@microsoft/sp-build-web');

// Suppress SASS warnings for non-camelCase CSS classes (Fluent UI global classes)
build.addSuppression(`Warning - [sass] The local CSS class 'ms-Grid' is not camelCase and will not be type-safe.`);
build.addSuppression(`Warning - [sass] The local CSS class 'is-focused' is not camelCase and will not be type-safe.`);
build.addSuppression(`Warning - [sass] The local CSS class 'ms-Dropdown' is not camelCase and will not be type-safe.`);
build.addSuppression(`Warning - [sass] The local CSS class 'is-open' is not camelCase and will not be type-safe.`);
build.addSuppression(`Warning - [sass] The local CSS class 'ms-TextField-fieldGroup' is not camelCase and will not be type-safe.`);
build.addSuppression(`Warning - [sass] The local CSS class 'ms-Button--primary' is not camelCase and will not be type-safe.`);
build.addSuppression(`Warning - [sass] The local CSS class 'ms-Button--default' is not camelCase and will not be type-safe.`);
build.addSuppression(`Warning - [sass] The local CSS class 'ms-Stack' is not camelCase and will not be type-safe.`);
build.addSuppression(`Warning - [sass] The local CSS class 'ms-Stack-inner' is not camelCase and will not be type-safe.`);
build.addSuppression(`Warning - [sass] The local CSS class 'ms-Checkbox' is not camelCase and will not be type-safe.`);
build.addSuppression(`Warning - [sass] The local CSS class 'ms-Checkbox-label' is not camelCase and will not be type-safe.`);
build.addSuppression(`Warning - [sass] The local CSS class 'ms-Separator' is not camelCase and will not be type-safe.`);
build.addSuppression(`Warning - [sass] The local CSS class 'rbc-calendar' is not camelCase and will not be type-safe.`);
build.addSuppression(`Warning - [sass] The local CSS class 'rbc-month-view' is not camelCase and will not be type-safe.`);
build.addSuppression(`Warning - [sass] The local CSS class 'rbc-header' is not camelCase and will not be type-safe.`);
build.addSuppression(`Warning - [sass] The local CSS class 'rbc-date-cell' is not camelCase and will not be type-safe.`);
build.addSuppression(`Warning - [sass] The local CSS class 'rbc-off-range-bg' is not camelCase and will not be type-safe.`);
build.addSuppression(`Warning - [sass] The local CSS class 'rbc-today' is not camelCase and will not be type-safe.`);
build.addSuppression(`Warning - [sass] The local CSS class 'rbc-event' is not camelCase and will not be type-safe.`);
build.addSuppression(`Warning - [sass] The local CSS class 'rbc-event-content' is not camelCase and will not be type-safe.`);

var getTasks = build.rig.getTasks;
build.rig.getTasks = function () {
  var result = getTasks.call(build.rig);

  result.set('serve', result.get('serve-deprecated'));

  return result;
};

build.initialize(require('gulp'));

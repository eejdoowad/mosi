/**
 * Closure approach to passing src to actions.
 * Run with node tmp.js
 * Opted against this strategy for anticipated performance cost.
 */

/*
// Conceptually converts this
var actionFunction = (src) => ({
  id: (id) => id,
  src: () => src
});
// To this
var actions = {
  id: (src) => (id) => id,
  src: (src) => () => src
}
*/

var actionFunction = (src) => ({
  id: (id) => id,
  src: () => src
});


var types = Object.keys(actionFunction());

var actions = {};
types.forEach((type) => {
  actions[type] = (src) => actionFunction(src)[type];
});

var src = 'hello';
console.log(actions.id(src)(23));
console.log(actions.src(src)());

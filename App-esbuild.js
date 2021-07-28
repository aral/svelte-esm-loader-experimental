// node_modules/svelte/internal/index.mjs
function noop() {
}
function assign(tar, src) {
  for (const k in src)
    tar[k] = src[k];
  return tar;
}
function run(fn) {
  return fn();
}
function blank_object() {
  return Object.create(null);
}
function run_all(fns) {
  fns.forEach(run);
}
function is_function(thing) {
  return typeof thing === "function";
}
function safe_not_equal(a, b) {
  return a != a ? b == b : a !== b || (a && typeof a === "object" || typeof a === "function");
}
function is_empty(obj) {
  return Object.keys(obj).length === 0;
}
function create_slot(definition, ctx, $$scope, fn) {
  if (definition) {
    const slot_ctx = get_slot_context(definition, ctx, $$scope, fn);
    return definition[0](slot_ctx);
  }
}
function get_slot_context(definition, ctx, $$scope, fn) {
  return definition[1] && fn ? assign($$scope.ctx.slice(), definition[1](fn(ctx))) : $$scope.ctx;
}
function get_slot_changes(definition, $$scope, dirty, fn) {
  if (definition[2] && fn) {
    const lets = definition[2](fn(dirty));
    if ($$scope.dirty === void 0) {
      return lets;
    }
    if (typeof lets === "object") {
      const merged = [];
      const len = Math.max($$scope.dirty.length, lets.length);
      for (let i = 0; i < len; i += 1) {
        merged[i] = $$scope.dirty[i] | lets[i];
      }
      return merged;
    }
    return $$scope.dirty | lets;
  }
  return $$scope.dirty;
}
function update_slot_base(slot, slot_definition, ctx, $$scope, slot_changes, get_slot_context_fn) {
  if (slot_changes) {
    const slot_context = get_slot_context(slot_definition, ctx, $$scope, get_slot_context_fn);
    slot.p(slot_context, slot_changes);
  }
}
function get_all_dirty_from_scope($$scope) {
  if ($$scope.ctx.length > 32) {
    const dirty = [];
    const length = $$scope.ctx.length / 32;
    for (let i = 0; i < length; i++) {
      dirty[i] = -1;
    }
    return dirty;
  }
  return -1;
}
var tasks = new Set();
var is_hydrating = false;
function start_hydrating() {
  is_hydrating = true;
}
function end_hydrating() {
  is_hydrating = false;
}
function upper_bound(low, high, key, value) {
  while (low < high) {
    const mid = low + (high - low >> 1);
    if (key(mid) <= value) {
      low = mid + 1;
    } else {
      high = mid;
    }
  }
  return low;
}
function init_hydrate(target) {
  if (target.hydrate_init)
    return;
  target.hydrate_init = true;
  let children2 = target.childNodes;
  if (target.nodeName === "HEAD") {
    const myChildren = [];
    for (let i = 0; i < children2.length; i++) {
      const node = children2[i];
      if (node.claim_order !== void 0) {
        myChildren.push(node);
      }
    }
    children2 = myChildren;
  }
  const m = new Int32Array(children2.length + 1);
  const p = new Int32Array(children2.length);
  m[0] = -1;
  let longest = 0;
  for (let i = 0; i < children2.length; i++) {
    const current = children2[i].claim_order;
    const seqLen = (longest > 0 && children2[m[longest]].claim_order <= current ? longest + 1 : upper_bound(1, longest, (idx) => children2[m[idx]].claim_order, current)) - 1;
    p[i] = m[seqLen] + 1;
    const newLen = seqLen + 1;
    m[newLen] = i;
    longest = Math.max(newLen, longest);
  }
  const lis = [];
  const toMove = [];
  let last = children2.length - 1;
  for (let cur = m[longest] + 1; cur != 0; cur = p[cur - 1]) {
    lis.push(children2[cur - 1]);
    for (; last >= cur; last--) {
      toMove.push(children2[last]);
    }
    last--;
  }
  for (; last >= 0; last--) {
    toMove.push(children2[last]);
  }
  lis.reverse();
  toMove.sort((a, b) => a.claim_order - b.claim_order);
  for (let i = 0, j = 0; i < toMove.length; i++) {
    while (j < lis.length && toMove[i].claim_order >= lis[j].claim_order) {
      j++;
    }
    const anchor = j < lis.length ? lis[j] : null;
    target.insertBefore(toMove[i], anchor);
  }
}
function append(target, node) {
  target.appendChild(node);
}
function append_styles(target, style_sheet_id, styles) {
  const append_styles_to = get_root_for_style(target);
  if (!append_styles_to.getElementById(style_sheet_id)) {
    const style = element("style");
    style.id = style_sheet_id;
    style.textContent = styles;
    append_stylesheet(append_styles_to, style);
  }
}
function get_root_for_style(node) {
  if (!node)
    return document;
  const root = node.getRootNode ? node.getRootNode() : node.ownerDocument;
  if (root.host) {
    return root;
  }
  return document;
}
function append_stylesheet(node, style) {
  append(node.head || node, style);
}
function append_hydration(target, node) {
  if (is_hydrating) {
    init_hydrate(target);
    if (target.actual_end_child === void 0 || target.actual_end_child !== null && target.actual_end_child.parentElement !== target) {
      target.actual_end_child = target.firstChild;
    }
    while (target.actual_end_child !== null && target.actual_end_child.claim_order === void 0) {
      target.actual_end_child = target.actual_end_child.nextSibling;
    }
    if (node !== target.actual_end_child) {
      if (node.claim_order !== void 0 || node.parentNode !== target) {
        target.insertBefore(node, target.actual_end_child);
      }
    } else {
      target.actual_end_child = node.nextSibling;
    }
  } else if (node.parentNode !== target) {
    target.appendChild(node);
  }
}
function insert_hydration(target, node, anchor) {
  if (is_hydrating && !anchor) {
    append_hydration(target, node);
  } else if (node.parentNode !== target || node.nextSibling != anchor) {
    target.insertBefore(node, anchor || null);
  }
}
function detach(node) {
  node.parentNode.removeChild(node);
}
function element(name) {
  return document.createElement(name);
}
function svg_element(name) {
  return document.createElementNS("http://www.w3.org/2000/svg", name);
}
function text(data) {
  return document.createTextNode(data);
}
function space() {
  return text(" ");
}
function attr(node, attribute, value) {
  if (value == null)
    node.removeAttribute(attribute);
  else if (node.getAttribute(attribute) !== value)
    node.setAttribute(attribute, value);
}
function children(element2) {
  return Array.from(element2.childNodes);
}
function init_claim_info(nodes) {
  if (nodes.claim_info === void 0) {
    nodes.claim_info = { last_index: 0, total_claimed: 0 };
  }
}
function claim_node(nodes, predicate, processNode, createNode, dontUpdateLastIndex = false) {
  init_claim_info(nodes);
  const resultNode = (() => {
    for (let i = nodes.claim_info.last_index; i < nodes.length; i++) {
      const node = nodes[i];
      if (predicate(node)) {
        const replacement = processNode(node);
        if (replacement === void 0) {
          nodes.splice(i, 1);
        } else {
          nodes[i] = replacement;
        }
        if (!dontUpdateLastIndex) {
          nodes.claim_info.last_index = i;
        }
        return node;
      }
    }
    for (let i = nodes.claim_info.last_index - 1; i >= 0; i--) {
      const node = nodes[i];
      if (predicate(node)) {
        const replacement = processNode(node);
        if (replacement === void 0) {
          nodes.splice(i, 1);
        } else {
          nodes[i] = replacement;
        }
        if (!dontUpdateLastIndex) {
          nodes.claim_info.last_index = i;
        } else if (replacement === void 0) {
          nodes.claim_info.last_index--;
        }
        return node;
      }
    }
    return createNode();
  })();
  resultNode.claim_order = nodes.claim_info.total_claimed;
  nodes.claim_info.total_claimed += 1;
  return resultNode;
}
function claim_element(nodes, name, attributes, svg) {
  return claim_node(nodes, (node) => node.nodeName === name, (node) => {
    const remove = [];
    for (let j = 0; j < node.attributes.length; j++) {
      const attribute = node.attributes[j];
      if (!attributes[attribute.name]) {
        remove.push(attribute.name);
      }
    }
    remove.forEach((v) => node.removeAttribute(v));
    return void 0;
  }, () => svg ? svg_element(name) : element(name));
}
function claim_text(nodes, data) {
  return claim_node(nodes, (node) => node.nodeType === 3, (node) => {
    const dataStr = "" + data;
    if (node.data.startsWith(dataStr)) {
      if (node.data.length !== dataStr.length) {
        return node.splitText(dataStr.length);
      }
    } else {
      node.data = dataStr;
    }
  }, () => text(data), true);
}
function claim_space(nodes) {
  return claim_text(nodes, " ");
}
function set_data(text2, data) {
  data = "" + data;
  if (text2.wholeText !== data)
    text2.data = data;
}
var active_docs = new Set();
var current_component;
function set_current_component(component) {
  current_component = component;
}
var dirty_components = [];
var binding_callbacks = [];
var render_callbacks = [];
var flush_callbacks = [];
var resolved_promise = Promise.resolve();
var update_scheduled = false;
function schedule_update() {
  if (!update_scheduled) {
    update_scheduled = true;
    resolved_promise.then(flush);
  }
}
function add_render_callback(fn) {
  render_callbacks.push(fn);
}
var flushing = false;
var seen_callbacks = new Set();
function flush() {
  if (flushing)
    return;
  flushing = true;
  do {
    for (let i = 0; i < dirty_components.length; i += 1) {
      const component = dirty_components[i];
      set_current_component(component);
      update(component.$$);
    }
    set_current_component(null);
    dirty_components.length = 0;
    while (binding_callbacks.length)
      binding_callbacks.pop()();
    for (let i = 0; i < render_callbacks.length; i += 1) {
      const callback = render_callbacks[i];
      if (!seen_callbacks.has(callback)) {
        seen_callbacks.add(callback);
        callback();
      }
    }
    render_callbacks.length = 0;
  } while (dirty_components.length);
  while (flush_callbacks.length) {
    flush_callbacks.pop()();
  }
  update_scheduled = false;
  flushing = false;
  seen_callbacks.clear();
}
function update($$) {
  if ($$.fragment !== null) {
    $$.update();
    run_all($$.before_update);
    const dirty = $$.dirty;
    $$.dirty = [-1];
    $$.fragment && $$.fragment.p($$.ctx, dirty);
    $$.after_update.forEach(add_render_callback);
  }
}
var outroing = new Set();
var outros;
function transition_in(block, local) {
  if (block && block.i) {
    outroing.delete(block);
    block.i(local);
  }
}
function transition_out(block, local, detach2, callback) {
  if (block && block.o) {
    if (outroing.has(block))
      return;
    outroing.add(block);
    outros.c.push(() => {
      outroing.delete(block);
      if (callback) {
        if (detach2)
          block.d(1);
        callback();
      }
    });
    block.o(local);
  }
}
var globals = typeof window !== "undefined" ? window : typeof globalThis !== "undefined" ? globalThis : global;
var boolean_attributes = new Set([
  "allowfullscreen",
  "allowpaymentrequest",
  "async",
  "autofocus",
  "autoplay",
  "checked",
  "controls",
  "default",
  "defer",
  "disabled",
  "formnovalidate",
  "hidden",
  "ismap",
  "loop",
  "multiple",
  "muted",
  "nomodule",
  "novalidate",
  "open",
  "playsinline",
  "readonly",
  "required",
  "reversed",
  "selected"
]);
function create_component(block) {
  block && block.c();
}
function claim_component(block, parent_nodes) {
  block && block.l(parent_nodes);
}
function mount_component(component, target, anchor, customElement) {
  const { fragment, on_mount, on_destroy, after_update } = component.$$;
  fragment && fragment.m(target, anchor);
  if (!customElement) {
    add_render_callback(() => {
      const new_on_destroy = on_mount.map(run).filter(is_function);
      if (on_destroy) {
        on_destroy.push(...new_on_destroy);
      } else {
        run_all(new_on_destroy);
      }
      component.$$.on_mount = [];
    });
  }
  after_update.forEach(add_render_callback);
}
function destroy_component(component, detaching) {
  const $$ = component.$$;
  if ($$.fragment !== null) {
    run_all($$.on_destroy);
    $$.fragment && $$.fragment.d(detaching);
    $$.on_destroy = $$.fragment = null;
    $$.ctx = [];
  }
}
function make_dirty(component, i) {
  if (component.$$.dirty[0] === -1) {
    dirty_components.push(component);
    schedule_update();
    component.$$.dirty.fill(0);
  }
  component.$$.dirty[i / 31 | 0] |= 1 << i % 31;
}
function init(component, options, instance3, create_fragment5, not_equal, props, append_styles2, dirty = [-1]) {
  const parent_component = current_component;
  set_current_component(component);
  const $$ = component.$$ = {
    fragment: null,
    ctx: null,
    props,
    update: noop,
    not_equal,
    bound: blank_object(),
    on_mount: [],
    on_destroy: [],
    on_disconnect: [],
    before_update: [],
    after_update: [],
    context: new Map(parent_component ? parent_component.$$.context : options.context || []),
    callbacks: blank_object(),
    dirty,
    skip_bound: false,
    root: options.target || parent_component.$$.root
  };
  append_styles2 && append_styles2($$.root);
  let ready = false;
  $$.ctx = instance3 ? instance3(component, options.props || {}, (i, ret, ...rest) => {
    const value = rest.length ? rest[0] : ret;
    if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
      if (!$$.skip_bound && $$.bound[i])
        $$.bound[i](value);
      if (ready)
        make_dirty(component, i);
    }
    return ret;
  }) : [];
  $$.update();
  ready = true;
  run_all($$.before_update);
  $$.fragment = create_fragment5 ? create_fragment5($$.ctx) : false;
  if (options.target) {
    if (options.hydrate) {
      start_hydrating();
      const nodes = children(options.target);
      $$.fragment && $$.fragment.l(nodes);
      nodes.forEach(detach);
    } else {
      $$.fragment && $$.fragment.c();
    }
    if (options.intro)
      transition_in(component.$$.fragment);
    mount_component(component, options.target, options.anchor, options.customElement);
    end_hydrating();
    flush();
  }
  set_current_component(parent_component);
}
var SvelteElement;
if (typeof HTMLElement === "function") {
  SvelteElement = class extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: "open" });
    }
    connectedCallback() {
      const { on_mount } = this.$$;
      this.$$.on_disconnect = on_mount.map(run).filter(is_function);
      for (const key in this.$$.slotted) {
        this.appendChild(this.$$.slotted[key]);
      }
    }
    attributeChangedCallback(attr2, _oldValue, newValue) {
      this[attr2] = newValue;
    }
    disconnectedCallback() {
      run_all(this.$$.on_disconnect);
    }
    $destroy() {
      destroy_component(this, 1);
      this.$destroy = noop;
    }
    $on(type, callback) {
      const callbacks = this.$$.callbacks[type] || (this.$$.callbacks[type] = []);
      callbacks.push(callback);
      return () => {
        const index = callbacks.indexOf(callback);
        if (index !== -1)
          callbacks.splice(index, 1);
      };
    }
    $set($$props) {
      if (this.$$set && !is_empty($$props)) {
        this.$$.skip_bound = true;
        this.$$set($$props);
        this.$$.skip_bound = false;
      }
    }
  };
}
var SvelteComponent = class {
  $destroy() {
    destroy_component(this, 1);
    this.$destroy = noop;
  }
  $on(type, callback) {
    const callbacks = this.$$.callbacks[type] || (this.$$.callbacks[type] = []);
    callbacks.push(callback);
    return () => {
      const index = callbacks.indexOf(callback);
      if (index !== -1)
        callbacks.splice(index, 1);
    };
  }
  $set($$props) {
    if (this.$$set && !is_empty($$props)) {
      this.$$.skip_bound = true;
      this.$$set($$props);
      this.$$.skip_bound = false;
    }
  }
};

// src/Layout.svelte
function add_css(target) {
  append_styles(target, "svelte-15mdyzj", "header.svelte-15mdyzj{border-bottom:1px solid blueviolet}footer.svelte-15mdyzj{border-top:1px solid blueviolet}");
}
function create_fragment(ctx) {
  let header;
  let h1;
  let t0;
  let t1;
  let t2;
  let footer;
  let small;
  let t3;
  let current;
  const default_slot_template = ctx[1].default;
  const default_slot = create_slot(default_slot_template, ctx, ctx[0], null);
  return {
    c() {
      header = element("header");
      h1 = element("h1");
      t0 = text("This is a header from the Layout.");
      t1 = space();
      if (default_slot)
        default_slot.c();
      t2 = space();
      footer = element("footer");
      small = element("small");
      t3 = text("This is a footer.");
      this.h();
    },
    l(nodes) {
      header = claim_element(nodes, "HEADER", { class: true });
      var header_nodes = children(header);
      h1 = claim_element(header_nodes, "H1", {});
      var h1_nodes = children(h1);
      t0 = claim_text(h1_nodes, "This is a header from the Layout.");
      h1_nodes.forEach(detach);
      header_nodes.forEach(detach);
      t1 = claim_space(nodes);
      if (default_slot)
        default_slot.l(nodes);
      t2 = claim_space(nodes);
      footer = claim_element(nodes, "FOOTER", { class: true });
      var footer_nodes = children(footer);
      small = claim_element(footer_nodes, "SMALL", {});
      var small_nodes = children(small);
      t3 = claim_text(small_nodes, "This is a footer.");
      small_nodes.forEach(detach);
      footer_nodes.forEach(detach);
      this.h();
    },
    h() {
      attr(header, "class", "svelte-15mdyzj");
      attr(footer, "class", "svelte-15mdyzj");
    },
    m(target, anchor) {
      insert_hydration(target, header, anchor);
      append_hydration(header, h1);
      append_hydration(h1, t0);
      insert_hydration(target, t1, anchor);
      if (default_slot) {
        default_slot.m(target, anchor);
      }
      insert_hydration(target, t2, anchor);
      insert_hydration(target, footer, anchor);
      append_hydration(footer, small);
      append_hydration(small, t3);
      current = true;
    },
    p(ctx2, [dirty]) {
      if (default_slot) {
        if (default_slot.p && (!current || dirty & 1)) {
          update_slot_base(default_slot, default_slot_template, ctx2, ctx2[0], !current ? get_all_dirty_from_scope(ctx2[0]) : get_slot_changes(default_slot_template, ctx2[0], dirty, null), null);
        }
      }
    },
    i(local) {
      if (current)
        return;
      transition_in(default_slot, local);
      current = true;
    },
    o(local) {
      transition_out(default_slot, local);
      current = false;
    },
    d(detaching) {
      if (detaching)
        detach(header);
      if (detaching)
        detach(t1);
      if (default_slot)
        default_slot.d(detaching);
      if (detaching)
        detach(t2);
      if (detaching)
        detach(footer);
    }
  };
}
function instance($$self, $$props, $$invalidate) {
  let { $$slots: slots = {}, $$scope } = $$props;
  $$self.$$set = ($$props2) => {
    if ("$$scope" in $$props2)
      $$invalidate(0, $$scope = $$props2.$$scope);
  };
  return [$$scope, slots];
}
var Layout = class extends SvelteComponent {
  constructor(options) {
    super();
    init(this, options, instance, create_fragment, safe_not_equal, {}, add_css);
  }
};
var Layout_default = Layout;

// src/InnerInner.svelte
function add_css2(target) {
  append_styles(target, "svelte-1dob82l", "p.svelte-1dob82l{color:salmon}");
}
function create_fragment2(ctx) {
  let p;
  let t;
  return {
    c() {
      p = element("p");
      t = text("This is an inner inner component.");
      this.h();
    },
    l(nodes) {
      p = claim_element(nodes, "P", { class: true });
      var p_nodes = children(p);
      t = claim_text(p_nodes, "This is an inner inner component.");
      p_nodes.forEach(detach);
      this.h();
    },
    h() {
      attr(p, "class", "svelte-1dob82l");
    },
    m(target, anchor) {
      insert_hydration(target, p, anchor);
      append_hydration(p, t);
    },
    p: noop,
    i: noop,
    o: noop,
    d(detaching) {
      if (detaching)
        detach(p);
    }
  };
}
var InnerInner = class extends SvelteComponent {
  constructor(options) {
    super();
    init(this, options, null, create_fragment2, safe_not_equal, {}, add_css2);
  }
};
var InnerInner_default = InnerInner;

// src/Inner.svelte
function create_fragment3(ctx) {
  let p;
  let strong;
  let t0;
  let t1;
  let innerinner;
  let current;
  innerinner = new InnerInner_default({});
  return {
    c() {
      p = element("p");
      strong = element("strong");
      t0 = text("This is an inner component.");
      t1 = space();
      create_component(innerinner.$$.fragment);
    },
    l(nodes) {
      p = claim_element(nodes, "P", {});
      var p_nodes = children(p);
      strong = claim_element(p_nodes, "STRONG", {});
      var strong_nodes = children(strong);
      t0 = claim_text(strong_nodes, "This is an inner component.");
      strong_nodes.forEach(detach);
      p_nodes.forEach(detach);
      t1 = claim_space(nodes);
      claim_component(innerinner.$$.fragment, nodes);
    },
    m(target, anchor) {
      insert_hydration(target, p, anchor);
      append_hydration(p, strong);
      append_hydration(strong, t0);
      insert_hydration(target, t1, anchor);
      mount_component(innerinner, target, anchor);
      current = true;
    },
    p: noop,
    i(local) {
      if (current)
        return;
      transition_in(innerinner.$$.fragment, local);
      current = true;
    },
    o(local) {
      transition_out(innerinner.$$.fragment, local);
      current = false;
    },
    d(detaching) {
      if (detaching)
        detach(p);
      if (detaching)
        detach(t1);
      destroy_component(innerinner, detaching);
    }
  };
}
var Inner = class extends SvelteComponent {
  constructor(options) {
    super();
    init(this, options, null, create_fragment3, safe_not_equal, {});
  }
};
var Inner_default = Inner;

// src/App.svelte
function add_css3(target) {
  append_styles(target, "svelte-1tb9iu1", "h1.svelte-1tb9iu1{color:red}");
}
function create_default_slot(ctx) {
  let h1;
  let t0;
  let t1;
  let t2;
  let t3;
  let p;
  let t4;
  let t5;
  let t6;
  let inner;
  let current;
  inner = new Inner_default({});
  return {
    c() {
      h1 = element("h1");
      t0 = text("Hello ");
      t1 = text(ctx[0]);
      t2 = text("!");
      t3 = space();
      p = element("p");
      t4 = text("Data: ");
      t5 = text(ctx[1]);
      t6 = space();
      create_component(inner.$$.fragment);
      this.h();
    },
    l(nodes) {
      h1 = claim_element(nodes, "H1", { class: true });
      var h1_nodes = children(h1);
      t0 = claim_text(h1_nodes, "Hello ");
      t1 = claim_text(h1_nodes, ctx[0]);
      t2 = claim_text(h1_nodes, "!");
      h1_nodes.forEach(detach);
      t3 = claim_space(nodes);
      p = claim_element(nodes, "P", {});
      var p_nodes = children(p);
      t4 = claim_text(p_nodes, "Data: ");
      t5 = claim_text(p_nodes, ctx[1]);
      p_nodes.forEach(detach);
      t6 = claim_space(nodes);
      claim_component(inner.$$.fragment, nodes);
      this.h();
    },
    h() {
      attr(h1, "class", "svelte-1tb9iu1");
    },
    m(target, anchor) {
      insert_hydration(target, h1, anchor);
      append_hydration(h1, t0);
      append_hydration(h1, t1);
      append_hydration(h1, t2);
      insert_hydration(target, t3, anchor);
      insert_hydration(target, p, anchor);
      append_hydration(p, t4);
      append_hydration(p, t5);
      insert_hydration(target, t6, anchor);
      mount_component(inner, target, anchor);
      current = true;
    },
    p(ctx2, dirty) {
      if (!current || dirty & 1)
        set_data(t1, ctx2[0]);
      if (!current || dirty & 2)
        set_data(t5, ctx2[1]);
    },
    i(local) {
      if (current)
        return;
      transition_in(inner.$$.fragment, local);
      current = true;
    },
    o(local) {
      transition_out(inner.$$.fragment, local);
      current = false;
    },
    d(detaching) {
      if (detaching)
        detach(h1);
      if (detaching)
        detach(t3);
      if (detaching)
        detach(p);
      if (detaching)
        detach(t6);
      destroy_component(inner, detaching);
    }
  };
}
function create_fragment4(ctx) {
  let layout;
  let current;
  layout = new Layout_default({
    props: {
      $$slots: { default: [create_default_slot] },
      $$scope: { ctx }
    }
  });
  return {
    c() {
      create_component(layout.$$.fragment);
    },
    l(nodes) {
      claim_component(layout.$$.fragment, nodes);
    },
    m(target, anchor) {
      mount_component(layout, target, anchor);
      current = true;
    },
    p(ctx2, [dirty]) {
      const layout_changes = {};
      if (dirty & 7) {
        layout_changes.$$scope = { dirty, ctx: ctx2 };
      }
      layout.$set(layout_changes);
    },
    i(local) {
      if (current)
        return;
      transition_in(layout.$$.fragment, local);
      current = true;
    },
    o(local) {
      transition_out(layout.$$.fragment, local);
      current = false;
    },
    d(detaching) {
      destroy_component(layout, detaching);
    }
  };
}
function instance2($$self, $$props, $$invalidate) {
  let { name } = $$props;
  let data = ["this", "could", "be", "from", "a", "database"];
  setTimeout(() => {
    $$invalidate(1, data = ["and", "this", "could", "be", "an", "update", "from", "the", "server"]);
  }, 2e3);
  $$self.$$set = ($$props2) => {
    if ("name" in $$props2)
      $$invalidate(0, name = $$props2.name);
  };
  return [name, data];
}
var App = class extends SvelteComponent {
  constructor(options) {
    super();
    init(this, options, instance2, create_fragment4, safe_not_equal, { name: 0 }, add_css3);
  }
};
var App_default = App;
export {
  App_default as default
};

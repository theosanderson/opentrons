import functools
import logging

log = logging.getLogger(__name__)


def _get_object_tree(shallow, path, refs, depth, obj):

    def object_container(value):
        # Save id of instance of object's type as a reference too
        # We will need it to keep track of types the same we are
        # tracking objects
        t = type(obj)
        refs[id(t)] = t
        return {'i': id(obj), 't': id(t), 'v': value}

    # TODO: what's the better way to detect primitive types?
    if isinstance(obj, (str, int, bool, float, complex)) or obj is None:
        return obj

    # If we have ourself in path, it's a circular reference
    # we are terminating it with a valid id but a value of None
    if hasattr(obj, '__dict__') and id(obj) in path:
        return object_container(None)

    # Shorthand for calling ourselves recursively
    object_tree = functools.partial(
        _get_object_tree, shallow, path, refs, depth+1)

    path += [id(obj)]

    # If shallow, go only one level deep
    if depth > 0 and shallow:
        return {}

    if isinstance(obj, (list, tuple)):
        return [object_tree(o) for o in obj]

    def iterate(kv): return {str(k): object_tree(v) for k, v in kv.items()}

    if isinstance(obj, dict):
        return object_container(iterate(obj))
    elif hasattr(obj, '__dict__'):
        refs[id(obj)] = obj
        items = []
        # If Type is iterable we will iterate generating numeric keys and
        # and merge with the output
        try:
            items = [object_tree(o) for o in obj]
        except TypeError:
            pass
        tail = {str(i): v for i, v in enumerate(items)}
        return object_container({**iterate(obj.__dict__), **tail})
    else:
        return object_container({})


def get_object_tree(obj, shallow=False):
    refs = {}
    tree = _get_object_tree(shallow, [], refs, 0, obj)
    return (tree, refs)

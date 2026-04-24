def unused_helper():
    return "dead"

def public_api():
    return "used"

def _private_used():
    return "also used"

result = public_api() + _private_used()

<?php
class Validator {
    private array $errors = [];
    private array $data;
    
    public function __construct(array $data) {
        $this->data = $data;
    }
    
    public function required(string $field, string $label = null): self {
        $label = $label ?? $field;
        if (!isset($this->data[$field]) || trim($this->data[$field]) === '') {
            $this->errors[$field] = "{$label} is required";
        }
        return $this;
    }
    
    public function email(string $field): self {
        if (isset($this->data[$field]) && !filter_var($this->data[$field], FILTER_VALIDATE_EMAIL)) {
            $this->errors[$field] = 'Invalid email address';
        }
        return $this;
    }
    
    public function minLength(string $field, int $min, string $label = null): self {
        $label = $label ?? $field;
        if (isset($this->data[$field]) && strlen($this->data[$field]) < $min) {
            $this->errors[$field] = "{$label} must be at least {$min} characters";
        }
        return $this;
    }
    
    public function in(string $field, array $allowed, string $label = null): self {
        $label = $label ?? $field;
        if (isset($this->data[$field]) && !in_array($this->data[$field], $allowed)) {
            $this->errors[$field] = "{$label} must be one of: " . implode(', ', $allowed);
        }
        return $this;
    }
    
    public function date(string $field, string $label = null): self {
        $label = $label ?? $field;
        if (isset($this->data[$field])) {
            $d = DateTime::createFromFormat('Y-m-d', $this->data[$field]);
            if (!$d || $d->format('Y-m-d') !== $this->data[$field]) {
                $this->errors[$field] = "{$label} must be a valid date (YYYY-MM-DD)";
            }
        }
        return $this;
    }
    
    public function time(string $field, string $label = null): self {
        $label = $label ?? $field;
        if (isset($this->data[$field]) && !preg_match('/^([01]\d|2[0-3]):([0-5]\d)$/', $this->data[$field])) {
            $this->errors[$field] = "{$label} must be a valid time (HH:MM)";
        }
        return $this;
    }
    
    public function integer(string $field, string $label = null): self {
        $label = $label ?? $field;
        if (isset($this->data[$field]) && !is_numeric($this->data[$field])) {
            $this->errors[$field] = "{$label} must be a number";
        }
        return $this;
    }
    
    public function passes(): bool {
        return empty($this->errors);
    }
    
    public function errors(): array {
        return $this->errors;
    }
    
    public function validate(): void {
        if (!$this->passes()) {
            Response::validationError($this->errors);
        }
    }
}

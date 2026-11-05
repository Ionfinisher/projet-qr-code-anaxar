<?php

namespace Tests\Unit;

use App\Support\ContainerNumber;
use InvalidArgumentException;
use PHPUnit\Framework\TestCase;

class ContainerNumberTest extends TestCase
{
    public function test_valid_container_numbers_are_accepted(): void
    {
        $this->assertTrue(ContainerNumber::isValid('MSCU4829130'));
        $this->assertTrue(ContainerNumber::isValid('CSQU3054383'));
        $this->assertTrue(ContainerNumber::isValid('TGHU1234567'));
    }

    public function test_normalization_ignores_case_spaces_and_separators(): void
    {
        $this->assertSame('MSCU4829130', ContainerNumber::normalize(' mscu 482913-0 '));
        $this->assertTrue(ContainerNumber::isValid(' mscu 482913-0 '));
    }

    public function test_invalid_check_digit_is_rejected(): void
    {
        $this->assertFalse(ContainerNumber::isValid('MSKU1234567'));
    }

    public function test_invalid_equipment_category_is_rejected(): void
    {
        $this->assertFalse(ContainerNumber::isValid('MSCA4829130'));
    }

    public function test_incomplete_or_non_numeric_serial_is_rejected(): void
    {
        $this->assertFalse(ContainerNumber::isValid('MSCU482913'));
        $this->assertFalse(ContainerNumber::isValid('MSCU48291A0'));
        $this->assertFalse(ContainerNumber::isValid(''));
    }

    public function test_check_digit_is_computed_from_the_first_ten_characters(): void
    {
        $this->assertSame(0, ContainerNumber::checkDigit('MSCU482913'));
        $this->assertSame(3, ContainerNumber::checkDigit('CSQU305438'));
        $this->assertSame(7, ContainerNumber::checkDigit('TGHU123456'));
    }

    public function test_check_digit_requires_exactly_ten_characters(): void
    {
        $this->expectException(InvalidArgumentException::class);

        ContainerNumber::checkDigit('MSCU48291');
    }
}

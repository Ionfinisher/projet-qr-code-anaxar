<?php

namespace Tests\Unit;

use App\Support\PhoneNumber;
use PHPUnit\Framework\TestCase;

class PhoneNumberTest extends TestCase
{
    public function test_valid_corridor_numbers_are_accepted(): void
    {
        $this->assertTrue(PhoneNumber::isValidE164('+22890123456'));
        $this->assertTrue(PhoneNumber::isValidE164('+2299012345678'));
        $this->assertTrue(PhoneNumber::isValidE164('+233901234567'));
        $this->assertTrue(PhoneNumber::isValidE164('+2259012345678'));
    }

    public function test_numbers_outside_the_corridor_are_rejected(): void
    {
        $this->assertFalse(PhoneNumber::isValidE164('+33612345678'));
        $this->assertFalse(PhoneNumber::isValidE164('+2289012345'));
        $this->assertFalse(PhoneNumber::isValidE164('+228901234567'));
        $this->assertFalse(PhoneNumber::isValidE164('22890123456'));
        $this->assertFalse(PhoneNumber::isValidE164('+2289012345A'));
        $this->assertFalse(PhoneNumber::isValidE164(null));
        $this->assertFalse(PhoneNumber::isValidE164(''));
    }

    public function test_country_is_detected_from_the_dial_code(): void
    {
        $this->assertSame('TG', PhoneNumber::countryFor('+22890123456'));
        $this->assertSame('BJ', PhoneNumber::countryFor('+2299012345678'));
        $this->assertSame('CI', PhoneNumber::countryFor('+2259012345678'));
        $this->assertNull(PhoneNumber::countryFor('+33612345678'));
        $this->assertNull(PhoneNumber::countryFor(null));
    }
}

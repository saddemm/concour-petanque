#!/usr/bin/env python3
"""
Test du mode MELEE de 12 à 80 équipes
"""

import json
import subprocess
import sys
import time

BASE_URL = 'http://localhost:3000'

def api_call(method, endpoint, data=None):
    cmd = ['curl', '-s']
    if method != 'GET':
        cmd.extend(['-X', method])
    cmd.append(f'{BASE_URL}{endpoint}')
    cmd.extend(['-H', 'Content-Type: application/json'])
    if data:
        cmd.extend(['-d', json.dumps(data)])
    result = subprocess.run(cmd, capture_output=True, text=True)
    try:
        return json.loads(result.stdout)
    except:
        return {'error': 'Parse error', 'raw': result.stdout[:500]}

def test_melee_tournament(num_teams, team_type='DOUBLETTE'):
    """Test d'un tournoi en mode MELEE"""
    players_per_team = {'TETE_A_TETE': 1, 'DOUBLETTE': 2, 'TRIPLETTE': 3}.get(team_type, 2)
    num_players = num_teams * players_per_team

    # Créer le concours en mode MELEE
    result = api_call('POST', '/api/contests', {
        'name': f'Test MELEE {num_teams} équipes',
        'teamType': team_type,
        'gameMode': 'MELEE'
    })
    if 'error' in result or 'id' not in result:
        return False, f"Erreur création: {result}"

    contest_id = result['id']

    # Ajouter les joueurs
    for i in range(1, num_players + 1):
        api_call('POST', f'/api/contests/{contest_id}/melee-players', {'name': f'Joueur{i}'})

    # Générer le tirage (crée les équipes automatiquement)
    result = api_call('POST', f'/api/contests/{contest_id}/draw')
    if 'error' in result:
        api_call('DELETE', f'/api/contests/{contest_id}')
        return False, f"Erreur tirage: {result}"

    # Jouer les matchs de qualification
    for _ in range(100):
        contest = api_call('GET', f'/api/contests/{contest_id}')
        played = 0
        for rd in contest.get('qualificationRounds', []):
            for m in rd.get('matches', []):
                if m['status'] != 'FINISHED' and not m.get('isBye'):
                    home, away = m.get('homeTeam'), m.get('awayTeam')
                    if home and away:
                        api_call('PATCH', f'/api/contests/{contest_id}/qualification-matches/{m["id"]}',
                                {'winnerTeamId': home['id']})
                        played += 1
        if played == 0:
            break

    # Jouer les matchs de brackets
    for _ in range(50):
        contest = api_call('GET', f'/api/contests/{contest_id}')
        played = 0
        for bracket in contest.get('brackets', []):
            for rd in bracket.get('rounds', []):
                for m in rd.get('matches', []):
                    if m.get('isBye') or m['status'] == 'FINISHED':
                        continue
                    home, away = m.get('homeTeam'), m.get('awayTeam')
                    if home and away:
                        api_call('PATCH', f'/api/contests/{contest_id}/bracket-matches/{m["id"]}',
                                {'winnerTeamId': home['id']})
                        played += 1
        if played == 0:
            break

    # Vérifier les finales
    contest = api_call('GET', f'/api/contests/{contest_id}')
    success = True
    errors = []

    for bracket in contest.get('brackets', []):
        finale = None
        for rd in bracket.get('rounds', []):
            if 'Finale' in rd.get('roundName', '') and rd.get('matches'):
                finale = rd['matches'][0]
                break

        if finale:
            if finale['status'] == 'FINISHED' or finale.get('isBye'):
                pass  # OK
            else:
                home, away = finale.get('homeTeam'), finale.get('awayTeam')
                if not home or not away:
                    success = False
                    errors.append(f"Bracket {bracket['type']}: Finale incomplète")
                else:
                    success = False
                    errors.append(f"Bracket {bracket['type']}: Finale non jouée")
        else:
            success = False
            errors.append(f"Bracket {bracket['type']}: Pas de finale")

    # Nettoyer
    api_call('DELETE', f'/api/contests/{contest_id}')

    return success, "; ".join(errors) if errors else "OK"

def main():
    min_teams = int(sys.argv[1]) if len(sys.argv) > 1 else 12
    max_teams = int(sys.argv[2]) if len(sys.argv) > 2 else 40

    print(f"\n{'='*70}")
    print(f"TEST MELEE DE {min_teams} À {max_teams} ÉQUIPES")
    print(f"{'='*70}\n")

    results = {}
    failed = []

    for n in range(min_teams, max_teams + 1):
        success, msg = test_melee_tournament(n)
        results[n] = success
        status = "✅" if success else "❌"
        print(f"{status} {n:3d} équipes ({n*2} joueurs): {msg}")
        if not success:
            failed.append((n, msg))
        time.sleep(0.1)

    # Résumé
    passed = sum(1 for v in results.values() if v)
    total = len(results)

    print(f"\n{'='*70}")
    print(f"RÉSUMÉ: {passed}/{total} tests réussis")
    print(f"{'='*70}")

    if failed:
        print("\nÉCHECS:")
        for n, msg in failed:
            print(f"  ❌ {n} équipes: {msg}")
        sys.exit(1)
    else:
        print("\n🎉 TOUS LES TESTS MELEE PASSENT!")
        sys.exit(0)

if __name__ == '__main__':
    main()
